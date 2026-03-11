import fs from "node:fs/promises";
import path from "node:path";
import AppError from "../../../common/errors/AppError.js";
import { resolveUnifiedScoreFromPrivateMetrics } from "../../../common/metrics/moderationMetrics.js";
import {
  buildPublicAuthorSummary,
  resolveProfileImageUrl,
  resolvePublicReputation,
} from "../../../common/users/publicAuthor.js";
import { normalizeFollowedTag, normalizeFollowedTags } from "../../../common/tags/followedTags.js";

class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
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

    return normalizeFollowedTags(user.followedTags);
  }

  async followTag(userId, payload) {
    const tag = normalizeFollowedTag(payload?.tag);
    if (!tag) {
      throw new AppError("Provide a valid tag to follow.", "VALIDATION_ERROR", 400, {
        field: "tag",
      });
    }

    const updated = await this.userRepository.addFollowedTag(userId, tag);
    if (!updated) {
      throw new AppError("User not found.", "NOT_FOUND", 404);
    }

    const followedTags = normalizeFollowedTags(updated.followedTags);
    await this.userRepository.replaceFollowedTags(userId, followedTags);

    return {
      tag,
      followedTags,
    };
  }

  async unfollowTag(userId, tagValue) {
    const tag = normalizeFollowedTag(tagValue);
    if (!tag) {
      throw new AppError("Provide a valid tag to remove.", "VALIDATION_ERROR", 400, {
        field: "tag",
      });
    }

    const updated = await this.userRepository.removeFollowedTag(userId, tag);
    if (!updated) {
      throw new AppError("User not found.", "NOT_FOUND", 404);
    }

    return {
      removedTag: tag,
      followedTags: normalizeFollowedTags(updated.followedTags),
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



