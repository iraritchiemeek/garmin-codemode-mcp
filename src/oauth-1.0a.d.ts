declare module "oauth-1.0a" {
  interface Consumer {
    key: string;
    secret: string;
  }

  interface Token {
    key: string;
    secret: string;
  }

  interface RequestData {
    url: string;
    method: string;
    data?: Record<string, string>;
  }

  interface OAuthData {
    oauth_consumer_key: string;
    oauth_nonce: string;
    oauth_signature_method: string;
    oauth_timestamp: number;
    oauth_version: string;
    oauth_token?: string;
    oauth_signature?: string;
  }

  interface Header {
    Authorization: string;
  }

  interface Options {
    consumer: Consumer;
    signature_method: string;
    hash_function: (baseString: string, key: string) => string;
  }

  class OAuth {
    constructor(options: Options);
    authorize(request: RequestData, token?: Token): OAuthData;
    toHeader(oauthData: OAuthData): Header;
    getBaseString(request: RequestData, oauthData: OAuthData): string;
    getSigningKey(tokenSecret?: string): string;
  }

  export default OAuth;
}
