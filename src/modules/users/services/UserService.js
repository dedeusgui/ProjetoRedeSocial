import fs from "node:fs/promises";
import path from "node:path";
import AppError from "../../../common/errors/AppError.js";
import { resolveUnifiedScoreFromPrivateMetrics } from "../../../common/metrics/moderationMetrics.js";
import {
  buildPublicAuthorSummary,
  resolveProfileImageUrl,
  resolvePublicReputation,
} from "../../../common/users/publicAuthor.js";
import {
  FOLLOWED_TAG_ALLOWED_DESCRIPTION,
  FOLLOWED_TAG_MAX_LENGTH,
  normalizeFollowedTags,
  validateFollowedTagValue,
} from "../../../common/tags/followedTags.js";

class UserService {
  constructor(userRepository, accountDeletionService = null) {
    this.userRepository = userRepository;
    this.accountDeletionService = accountDeletionService;
  }

  areStringListsEqual(left, right) {
    const leftList = Array.isArray(left) ? left.map((value) => String(value ?? "")) : [];
    const rightList = Array.isArray(right) ? right.map((value) => String(value ?? "")) : [];

    if (leftList.length !== rightList.length) {
      return false;
    }

    return leftList.every((value, index) => value === rightList[index]);
  }

  assertValidFollowedTag(value, { message } = {}) {
    const result = validateFollowedTagValue(value);
    if (!result.errorCode) {
      return result.normalizedValue;
    }

    if (result.errorCode === "too_long") {
      throw new AppError(
        `The tag must be at most ${FOLLOWED_TAG_MAX_LENGTH} characters.`,
        "VALIDATION_ERROR",
        400,
        {
          field: "tag",
          maxLength: FOLLOWED_TAG_MAX_LENGTH,
        },
      );
    }

    if (result.errorCode === "invalid_chars") {
      throw new AppError(
        `Use only ${FOLLOWED_TAG_ALLOWED_DESCRIPTION} in followed tags.`,
        "VALIDATION_ERROR",
        400,
        {
          field: "tag",
          allowedDescription: FOLLOWED_TAG_ALLOWED_DESCRIPTION,
        },
      );
    }

    throw new AppError(message ?? "Provide a valid tag.", "VALIDATION_ERROR", 400, {
      field: "tag",
    });
  }

  async syncCanonicalFollowedTags(userId, values) {
    const canonicalFollowedTags = normalizeFollowedTags(values);
    if (this.areStringListsEqual(values, canonicalFollowedTags)) {
      return canonicalFollowedTags;
    }

    const updated = await this.userRepository.replaceFollowedTags(userId, canonicalFollowedTags);
    if (!updated) {
      throw new AppError("User not found.", "NOT_FOUND", 404);
    }

    return normalizeFollowedTags(updated.followedTags);
  }

  async getMeProfile(userId) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found.", "NOT_FOUND", 404);
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatarUrl: resolveProfileImageUrl(user.profileImage),
      publicReputation: resolvePublicReputation(user.privateMetrics),
      privateMetrics: {
        score: resolveUnifiedScoreFromPrivateMetrics(user.privateMetrics),
        totalReviews: user.privateMetrics?.totalReviews ?? 0,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async deleteMe(requester) {
    if (!this.accountDeletionService) {
      throw new Error("Account deletion service is unavailable.");
    }

    return this.accountDeletionService.deleteOwnAccount({
      userId: requester?.id,
    });
  }

  async safeDeleteFiles(filePaths) {
    await Promise.all(
      (Array.isArray(filePaths) ? filePaths : [])
        .filter((filePath) => typeof filePath === "string" && filePath.length > 0)
        .map(async (filePath) => {
          try {
            await fs.unlink(filePath);
            await this.removeEmptyParentDirectory(filePath);
          } catch (error) {
            if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY") {
              console.error(`Failed to remove uploaded avatar: ${filePath}`, error);
            }
          }
        }),
    );
  }

  async removeEmptyParentDirectory(filePath) {
    const parentDirectory = path.dirname(String(filePath ?? ""));
    if (!parentDirectory || parentDirectory === "." || parentDirectory === path.dirname(parentDirectory)) {
      return;
    }

    try {
      await fs.rmdir(parentDirectory);
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY") {
        console.error(`Failed to remove avatar directory: ${parentDirectory}`, error);
      }
    }
  }

  buildProfileImagePayload(file) {
    if (!file?.path) {
      return null;
    }

    return {
      url: `/uploads/avatars/${encodeURIComponent(path.basename(path.dirname(file.path)))}/${encodeURIComponent(file.filename)}`,
      storagePath: file.path,
      originalName: String(file.originalname ?? "").trim() || file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size ?? 0,
      updatedAt: new Date(),
    };
  }

  async updatePrivateMetrics(userId, privateMetrics) {
    const updated = await this.userRepository.updatePrivateMetrics(userId, privateMetrics);

    if (!updated) {
      throw new AppError("User not found.", "NOT_FOUND", 404);
    }

    return updated;
  }

  async getFollowedTags(userId) {
    const user = await this.userRepository.findFollowedTagsById(userId);

    if (!user) {
      throw new AppError("User not found.", "NOT_FOUND", 404);
    }

    return this.syncCanonicalFollowedTags(userId, user.followedTags);
  }

  async followTag(userId, payload) {
    const tag = this.assertValidFollowedTag(payload?.tag, {
      message: "Provide a valid tag to follow.",
    });

    const updated = await this.userRepository.addFollowedTag(userId, tag);
    if (!updated) {
      throw new AppError("User not found.", "NOT_FOUND", 404);
    }

    const followedTags = await this.syncCanonicalFollowedTags(userId, updated.followedTags);

    return {
      tag,
      followedTags,
    };
  }

  async unfollowTag(userId, tagValue) {
    const tag = this.assertValidFollowedTag(tagValue, {
      message: "Provide a valid tag to remove.",
    });

    const updated = await this.userRepository.removeFollowedTag(userId, tag);
    if (!updated) {
      throw new AppError("User not found.", "NOT_FOUND", 404);
    }

    return {
      removedTag: tag,
      followedTags: await this.syncCanonicalFollowedTags(userId, updated.followedTags),
    };
  }

  async uploadAvatar(userId, file) {
    if (!file?.path) {
      throw new AppError("Upload a profile image.", "VALIDATION_ERROR", 400, {
        field: "avatar",
      });
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      await this.safeDeleteFiles([file.path]);
      throw new AppError("User not found.", "NOT_FOUND", 404);
    }

    const nextProfileImage = this.buildProfileImagePayload(file);

    try {
      const updatedUser = await this.userRepository.updateProfileImage(userId, nextProfileImage);
      if (!updatedUser) {
        throw new AppError("User not found.", "NOT_FOUND", 404);
      }

      await this.safeDeleteFiles([user.profileImage?.storagePath]);

      return {
        avatarUrl: resolveProfileImageUrl(updatedUser.profileImage),
        publicReputation: resolvePublicReputation(updatedUser.privateMetrics),
        updatedAt: updatedUser.updatedAt,
      };
    } catch (error) {
      await this.safeDeleteFiles([file.path]);
      throw error;
    }
  }

  async deleteAvatar(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found.", "NOT_FOUND", 404);
    }

    const updatedUser = await this.userRepository.clearProfileImage(userId);
    if (!updatedUser) {
      throw new AppError("User not found.", "NOT_FOUND", 404);
    }

    await this.safeDeleteFiles([user.profileImage?.storagePath]);

    return {
      avatarUrl: resolveProfileImageUrl(updatedUser.profileImage),
      publicReputation: resolvePublicReputation(updatedUser.privateMetrics),
      updatedAt: updatedUser.updatedAt,
    };
  }

  buildPublicAuthorSummary(user) {
    return buildPublicAuthorSummary(user);
  }
}

export default UserService;



