// TODO: Implementar autenticação JWT
// Responsabilidade: Verificar se o usuário está autenticado antes de acessar rotas protegidas

const auth = (req, res, next) => {
  next();
};

export default auth;
