"use strict";

import {logger} from 'log';
import { EdgeKV } from './edgekv.js';
import { createResponse } from 'create-response';

// create the onClientResponse function
export async function onClientResponse(request, response)
{
  // this obtains the sha256 from the Akamai property manager config
  let sha256 = request.getVariable("PMUSER_POST_SRC_SHA256");
  let src = request.getVariable("PMUSER_POST_SRC");
  let dest = request.getVariable("PMUSER_POST_DEST");
  let ns_group = request.getVariable("PMUSER_NS_GROUP");
  let postbody = { "src": src, "dest": dest };

  logger.log("src = %s, dest = %s, postbody = %s", src, dest, JSON.stringify(postbody));

  // define the base namespace
  let namespace = "multiplatform-shared-redirect-1";
  let group = ns_group;

  // figure out sharding params
  // we need the sha256 hash for 2 reasons
  // 1. sharding across a namespace - for now we are assuming 2 namespaces
  // 2. within the namespace, storing the hash as the key for the redirect
  
  let firstchar = sha256.charAt(0);

  logger.log("hash = %s, firstchar = %s", sha256, firstchar);

  // figure out the namespace
  // this is from 0-F divided into 2 shards
  // 0-7 and 8-F
  if (firstchar == "0" || firstchar == "1" || firstchar == "2" || firstchar == "3" || firstchar == "4" || firstchar == "5" || firstchar == "6" || firstchar == "7")
    namespace = "multiplatform-shared-redirect-1";
  else
    namespace = "multiplatform-shared-redirect-2";

  logger.log("namespace picked = %s", namespace);

  // set up the Edgekv
  const edgeKv = new EdgeKV( { namespace: namespace, group: group } );

  let uploadresult = "";

  try
  {
    edgeKv.putJsonNoWait( { item: sha256, value: postbody });
//    logger.log("uploadresult = %s", JSON.stringify(uploadresult));  
  }
  catch (error)
  {
    uploadresult = "{}";
    logger.log("err = %s", error.toString());
  }

} // end function