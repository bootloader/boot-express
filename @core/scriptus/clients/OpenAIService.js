const { context, requireOptional } = require("@bootloader/utils");
const config = require("@bootloader/config");

const TokenKeysStore = require("../store/TokenKeysStore");
const { cachebox } = require("@bootloader/redison");

const { OpenAI, AzureOpenAI } = requireOptional("openai");
// const azureOpenAi = require("@azure/openai"); // {AzureKeyCredential}
// const { AzureKeyCredential } = require("@azure/openai"); // {AzureKeyCredential}
const azureIdentity = requireOptional("@azure/identity"); //{ ClientSecretCredential }

const defaulOpenAiConfig = {
  secret: { apiKey: config.getIfPresent("openai.token") },
  value: { provider: "OPENAI" },
  asDefault: config.getIfPresent("openai.as.default") || false,
};

function OpenAIService(options = {}) {
  let { domainbox, domain, useGlobalConfig, key } = options;
  domain = domain || context.getTenant();
  domainbox = domainbox || cachebox({ name: "domainbox", domain: domain, ttl: 60 * 60 * 24 * 1 });
  let openaiContext = domainbox.context("context.openai");

  let $config;
  this.getConfig = async function () {
    if (!$config) {
      $config = TokenKeysStore.get({
        domain,
        type: "gpt",
        key: key,
      });
    }
    let config = await $config;
    if (!config && (useGlobalConfig || defaulOpenAiConfig.asDefault)) {
      return defaulOpenAiConfig;
    }
    return config;
  };

  this.init = async function (initOptions = {}) {
    let { provider, authType, deployment, apiVersion, model } = initOptions;
    let doc = await this.getConfig();
    // console.log("doc===",options,"====",doc)
    let config = {
      provider: provider || options.provider || doc?.value?.provider || "OPENAI",
      authType: authType || options.authType || doc?.value?.azure?.authType || "KEY",
      model: model || options.model || doc?.value?.model || "gpt-3.5-turbo",
      deployment: deployment || options.deployment || doc?.value?.azure?.deployment || "gpt-3.5-turbo",
      apiVersion: apiVersion || options.apiVersion || doc?.value?.azure?.apiVersion || "2024-10-01",
    };

    if (doc?.value?.provider == "AZURE") {
      if (doc.value.azure.authType == "SECRET") {
        const azureCredential = new azureIdentity.ClientSecretCredential(
          doc?.value?.azure?.tenantId,
          doc?.value?.azure?.clientId,
          doc?.secret?.azure?.clientSecret
        );
        const azureADTokenProvider = async () => {
          let token = await openaiContext.get("token");
          if (!token) {
            let tokenResp = await azureCredential.getToken("https://cognitiveservices.azure.com/.default");
            token = tokenResp.token;
            if (token) {
              await openaiContext.set("token", token, { ttl: 45 * 60 });
            }
          }
          return token;
        };
        return {
          client: new AzureOpenAI({
            azureADTokenProvider,
            azureEndpoint: doc?.value?.azure?.endpoint,
          }),
          config,
        };
      } else if (doc.value.azure.authType == "TOKEN") {
        return {};
      } else {
        return {
          client: new AzureOpenAI({
            apiKey: doc.secret?.azure?.apiKey,
            endpoint: doc.value?.azure?.endpoint,
            deployment: config.deployment,
            apiVersion: config.apiVersion,
          }),
          config,
        };
      }
    } else if (doc?.secret?.apiKey) {
      return {
        client: new OpenAI({
          apiKey: doc?.secret?.apiKey,
        }),
        config,
      };
    } else {
      throw "Error ( No OpenAI Provider )";
    }
  };
}

OpenAIService.OpenAIService = OpenAIService;

module.exports = OpenAIService;
