const {setGlobalOptions, logger} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");

setGlobalOptions({maxInstances: 10});

exports.appStatus = onRequest((request, response) => {
  logger.info("App status requested", {
    method: request.method,
    path: request.path,
    userAgent: request.get("User-Agent"),
  });

  response.status(200).json({
    status: "ok",
    message: "ログインはブラウザ側で処理します。",
  });
});
