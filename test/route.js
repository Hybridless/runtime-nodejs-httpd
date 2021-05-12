export const handler = async (event, context) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      context.succeed({ body: {}, statusCode: 200 });
      resolve();
    }, 200);
  })
};
