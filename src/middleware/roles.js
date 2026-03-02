// TODO: Implementar verificação de papéis/permissões
// Responsabilidade: Controlar acesso a rotas privadas como aprovações/negações de posts
// Exemplo de uso: router.post('/posts/:id/review', auth, roles('admin', 'moderator'), reviewController.create)

const roles = (...allowedRoles) => {
  return (req, res, next) => {
    next();
  };
};

export default roles;
