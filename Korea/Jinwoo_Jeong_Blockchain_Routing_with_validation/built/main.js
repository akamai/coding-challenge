import { logger } from 'log';
import { EdgeKV } from 'edgekv.js';
class CheckValidRequest {
    constructor(validation_rules, request) {
        this.validation_rules = validation_rules;
        this.request = request;
        this.error_values = [];
        this.match_rules = [];
        this.least_content_len = 10;
        this.includesFuncList = ["getHeader", "userLocation"];
    }
    _get_key_count(obj) {
        return Object.keys(obj).length;
    }
    _check_match(rule) {
        let required_count = this._get_key_count(rule['match']);
        let match_count = 0;
        if (rule.hasOwnProperty("match")) {
            for (const match_key in rule['match']) {
                if (this._check_value(match_key, rule['match'][match_key])) {
                    match_count++;
                    let msg = `Matched rule '${match_key}' => '${rule['match'][match_key]}'`;
                    this.match_rules.push(msg);
                    logger.log(msg);
                }
            }
            if (match_count === required_count) {
                return true;
            }
        }
        return false;
    }
    _includes(target, item_list) {
        logger.log(`_includes [${target}, ${item_list}]`);
        if (typeof (item_list) === "object") {
            for (let item in item_list) {
                logger.log(`[target=${target}, item=${item_list[item]}]`);
                if (target.includes(item_list[item])) {
                    return true;
                }
            }
        }
        else if (target.includes(item_list)) {
            return true;
        }
        return false;
    }
    _not_match(rule_key, rule_value, request_value) {
        let rule_type = typeof (rule_value);
        let request_type = typeof (request_value);
        if (rule_type === 'object' || request_type === 'object') {
            logger.log("[--- start check ---]");
            if (this._includes(rule_value, request_value) === false) {
                this.error_values.push(`[OBJECT] Invalid ${rule_key}: '${request_value}', required '${rule_value}'`);
            }
        }
        else if (rule_value !== request_value) {
            // Missing required request parameters
            this.error_values.push(`Invalid ${rule_key}: '${request_value}', required '${rule_value}'`);
        }
    }
    _check_value(rule_key, rule_value, error = false) {
        let request_value;
        // if (rule_key === "getHeader") {
        if (this.includesFuncList.includes(rule_key)) {
            logger.log(`function -> ${rule_key}`);
            for (const func_key in rule_value) {
                try {
                    request_value = this.request[rule_key](func_key);
                }
                catch (_a) {
                    request_value = this.request[rule_key][func_key];
                }
                // request_value = this.request.getHeader(header_key);
                let this_rule_value = rule_value[func_key];
                logger.log(`[${rule_key}, '${func_key}', ${this_rule_value}, ${request_value}, error=${error}]`);
                if (error) {
                    this._not_match(`${rule_key} '${func_key}'`, this_rule_value, request_value);
                    if (this_rule_value === "application/json") {
                        let contentLength = this.request.getHeader("Content-Length");
                        if (!contentLength || contentLength.length == 0 || contentLength[0] < this.least_content_len) {
                            this.error_values.push(`Invalid Content-length: '${contentLength}', required bigger than '${this.least_content_len}'`);
                        }
                    }
                }
            }
        }
        else {
            request_value = this.request[rule_key];
            if (error) {
                this._not_match(rule_key, rule_value, request_value);
            }
        }
        if (rule_value === request_value) {
            return true;
        }
    }
    check() {
        this.validation_rules.forEach((rule) => {
            if (this._check_match(rule)) {
                logger.log("Matched Rule");
                if (rule.hasOwnProperty("required")) {
                    for (const rule_key in rule['required']) {
                        let required_key = rule['required'][rule_key];
                        if (this._check_value(rule_key, required_key, true)) {
                            logger.log(`Required Match: ${rule_key}, ${required_key}`);
                        }
                    }
                }
            }
            if (this.error_values.length > 0) {
                // logger.log("error=>", this.error_values)
                return this.request.respondWith(400, {}, JSON.stringify({ "match": this.match_rules, "error": this.error_values }));
            }
        });
    }
}
export async function onClientRequest(request) {
    //Use JSON.parse(‘string’) to instantiate larger JSON objects.
    const validation_rules = JSON.parse(`[
    {
      "match": {
        "url": "/api/v3"
      },
      "required": {
        "method": "POST",
        "getHeader": {
          "Content-type": "application/json"
        }
      }
    },{
      "match": {
        "url": "/api/v1"
      },
      "required": {
        "method": "GET",
        "getHeader": {
          "Content-type": "application/json"
        }
      }
    },{
      "match": {
        "url": "/api/debug/v3"
      },
      "required": {
        "method": "POST",
        "scheme": "https",
        "query": "q=something",
        "getHeader": {
          "MUST_HAVE": "true"
        }
      }
    },{
      "match": {
        "method": "POST"
      },
      "required": {
        "userLocation": {
          "country": ["JP", "US", "KR"]
        }
      }
    }
  ]`);
    new CheckValidRequest(validation_rules, request).check();
    // Set Up EdgeKV
    const edge_kv = new EdgeKV({ namespace: "blockchain_nodes", group: "info" });
    let fast_node = "";
    let err_msg = "";
    try {
        // @ts-ignore
        let fast_node_info = await edge_kv.getJson({ item: "mainnet", default_value: "" });
        fast_node = fast_node_info[0]['peer_ip'];
    }
    catch (error) {
        err_msg = error.toString();
        logger.log("EdgeKV error: ", err_msg);
    }
    request.setHeader("fast_node", fast_node);
    logger.log("request.host::", request.host);
    request.route({
        query: `fast_node=${fast_node}`
    });
}
