import express = require("express");

import cors = require("cors");
import bodyParser = require("body-parser");
/* eslint-disable */
import { trigger, verify } from "./utilities/slack";
const urlencodedParser = bodyParser.urlencoded({ extended: false });
/* eslint-enable */
const app = express();
/* eslint-disable */
// Automatically allow cross-origin requests
app.use(cors({ origin: true }));
/* eslint-enable */
app.post("/", urlencodedParser, async (request: any, response: any) => {
  const isLegitRequest = verify(request);
  if (!isLegitRequest) {
    return response.send({
      response_type: "in_channel",
      text: "Request verification failed!",
    });
  }
  // Slack API request parsing
  const text = request.body.text;
  const channelName = request.body.channel_name;

  // Allow request only from specific channel.(Optional)
  if (channelName != "build-generator") {
    return response.send({
      response_type: "in_channel",
      text: "Please start the build from #build-generator",
    });
  }

  // You can passed additional data with you slack command
  // Like : /build branchName|flavour|buildType|someMoreData
  // Here we are splitting that additional data
  const params = text.split("|");
  const env = ["Prod", "Staging"];
  const type = ["Release", "Debug"];
  if (params.length != 4) {
    return response.send({
      response_type: "in_channel",
      text: "4 params expected! Ex: branchName|flavour|buildType|someMoreData",
    });
  }
  if (env.includes(params[1]) == false) {
    return response.send({
      response_type: "in_channel",
      text: "Allowed params: Prod, Staging",
    });
  }
  if (type.includes(params[2]) == false) {
    return response.send({
      response_type: "in_channel",
      text: "Allowed params: Release, Debug",
    });
  }

  // Construct the command like "assembleProdDebug"
  /* eslint-disable */
  let buildType = `assemble${params[1]}${[params[2]]}`;

  // Verifying if we have all the required params and corresponding values
  switch (
    params.length == 4 &&
    env.includes(params[1]) &&
    type.includes(params[2])
  ) {
    case true:
      return trigger(
        params[0],
        params[1],
        request.body.user_name,
        request.body.user_id,
        params[3],
        buildType,
        response
      );
    default:
      return response.send({
        response_type: "in_channel",
        text: "Unexpected error!",
      });
    /* eslint-enable */
  }
});

export default app;
