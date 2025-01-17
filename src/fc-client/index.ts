import _ from "lodash";
import FC from "@alicloud/fc2";
import { getCredential } from "@serverless-devs/core";
import { CatchableError } from "../utils/errors";
import { checkEndpoint, getEndpointFromFcDefault } from "./endpoint";
import logger from "../utils/logger";
import { MakeFcClientInput } from "../utils/interface";
import { ICredentials } from "../interface";
import "./fc-client";

export { getEndpointFromFcDefault } from "./endpoint";
export * as alicloudFc2 from "@alicloud/fc2";

const DEFAULT_TIMEOUT = 600;

/**
 * 获取 fc client
 * @param props: { access: string; region: string; timeout?: number; credentials?: ICredentials; }
 * @returns
 */
export async function makeFcClient(props: MakeFcClientInput) {
  logger.debug(`input: ${JSON.stringify(props)}`);
  const region: string = props.region;
  const timeout: number = (props.timeout || DEFAULT_TIMEOUT) * 1000;
  if (!region) {
    throw new CatchableError("Please provide region in your props.");
  }
  logger.debug(`make fc client ${timeout}ms`);

  let credentials: ICredentials;
  if (_.isEmpty(props.credentials)) {
    const credentialRes: any = await getCredential(props.access);
    credentials = {
      AccountID: credentialRes?.AccountID,
      AccessKeyID: credentialRes?.AccessKeyID,
      AccessKeySecret: credentialRes?.AccessKeySecret,
      SecurityToken: credentialRes?.SecurityToken,
      endpoint: credentialRes?.endpoint,
    };
  } else {
    credentials = props.credentials;
  }

  const endpointFromCredentials: string = credentials.endpoint;
  const endpointFromFcDefault: string = await getEndpointFromFcDefault();

  let endpoint: string = null;
  if (endpointFromCredentials) {
    // 优先使用 credentials 中的 endpoint
    if (
      !checkEndpoint(region, credentials?.AccountID, endpointFromCredentials)
    ) {
      return;
    }
    endpoint = endpointFromCredentials;
  } else if (endpointFromFcDefault) {
    if (!checkEndpoint(region, credentials?.AccountID, endpointFromFcDefault)) {
      return;
    }
    endpoint = endpointFromFcDefault;
  }
  if (endpoint) {
    logger.debug(`Using endpoint ${endpoint}`);
  }
  return new FC(credentials.AccountID, {
    accessKeyID: credentials.AccessKeyID,
    accessKeySecret: credentials.AccessKeySecret,
    securityToken: credentials.SecurityToken,
    region,
    timeout,
    endpoint,
    secure: true,
  });
}
