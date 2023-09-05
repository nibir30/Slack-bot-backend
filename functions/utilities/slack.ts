import axios from "axios";
import * as crypto from "crypto";
import * as functions from "firebase-functions";
import timeSafeCompare = require("tsscmp");

const githubToken = functions.config().github.access_token;
const owner = functions.config().github.username;
const githubRepo = functions.config().github.repository;
const slackSigningSecret = functions.config().slack.signing_secret;
const fileName = functions.config().github.workflow_name;

export const verify = (request: any) => {
  // Grab the signature and timestamp from the headers
  const requestSignature = request.headers["x-slack-signature"] as string;
  const requestTimestamp = request.headers["x-slack-request-timestamp"];

  const body = request.rawBody;
  const data = body.toString();

  // Create the HMAC
  const hmac = crypto.createHmac("sha256", slackSigningSecret);

  // Update it with the Slack Request
  const [version, hash] = requestSignature.split("=");
  const base = `${version}:${requestTimestamp}:${data}`;
  hmac.update(base);

  // Returns true if it matches
  return timeSafeCompare(hash, hmac.digest("hex"));
};

export const trigger = async (
  branch: any,
  variant: any,
  user: any,
  userId: any,
  message: any,
  buildType: any,
  response: any
) => {
  const http = axios.create({
    baseURL: "https://api.github.com",
    auth: {
      username: owner,
      password: githubToken,
    },
    headers: {
      // Required https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event
      Accept: "application/vnd.github.v3+json",
    },
  });

  // Inputs for the Github action to run. Test
  const inputs = {
    buildType: buildType,
    branch: branch,
    message: message,
    variant: variant,
    user: user,
    user_id: userId,
  };
  const postData = {
    ref: branch,
    inputs: inputs,
  };

  return http
    .post(
      `/repos/${owner}/${githubRepo}/actions/workflows/${fileName}/dispatches`,
      postData
    )
    .then(() => {
      return response.send({
        response_type: "in_channel",
        text: "Build started! " + branch + " " + buildType,
      });
    })
    .catch((error) => {
      return response.send({
        response_type: "in_channel",
        text:
          "Something went wrong :/ \n ```\n" +
          JSON.stringify(error.toJSON()) +
          "\n```",
      });
    });
};
