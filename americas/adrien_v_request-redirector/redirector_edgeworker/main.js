"use strict";

import {logger} from 'log';
import { EdgeKV } from './edgekv.js';
import { createResponse } from 'create-response';

// create the responseProvider function
export async function responseProvider(request)
{
  // this obtains the sha256 from the Akamai property manager config
  let sha256 = request.getVariable("PMUSER_SHA256");
  let ns_group = request.getVariable("PMUSER_NS_GROUP");
  let default_destination = request.getVariable("PMUSER_EW_AK_HOST");

  // define the base namespaces
  let namespace = "multiplatform-shared-redirect-1";
  let group = ns_group;

  // figure out sharding params
  // we need the sha256 hash for 2 reasons
  // 1. sharding across a namespace - for now we are assuming 4 namespaces
  // 2. within the namespace, storing the hash as the key for the redirect
  
  let firstchar = sha256.charAt(0);

  logger.log("hash = %s, firstchar = %s", sha256, firstchar);

  // figure out the namespace
  // this is from 0-F divided into 4 shards
  if (firstchar == "0" || firstchar == "1" || firstchar == "2" || firstchar == "3")
    namespace = "multiplatform-shared-redirect-1";
  else if (firstchar == "4" || firstchar == "5" || firstchar == "6" || firstchar == "7")
    namespace = "multiplatform-shared-redirect-1";
  else if (firstchar == "8" || firstchar == "9" || firstchar == "a" || firstchar == "b")
    namespace = "multiplatform-shared-redirect-2";
  else
    namespace = "multiplatform-shared-redirect-2";

  logger.log("namespace picked = %s", namespace);

  // fetch from the EKV
  const edgeKv = new EdgeKV( { namespace: namespace, group: group } );
  let redirectresult = "";

  try
  {
    redirectresult = await edgeKv.getJson( { item: sha256, default_value: "{}" });
  }
  catch (error)
  {
    redirectresult = "{}";
    logger.log("err = %s", error.toString());
  }

  logger.log("redirect result = %s", JSON.stringify(redirectresult));

  // if we can fetch the result, we can also return it as a redirect
  if (redirectresult != "{}")
  { 
    // capture the destination
    let dest = redirectresult.dest;
    logger.log("dest = %s", dest);

    return createResponse(200, { "Location": dest, "Rewrite": "301" },"");    

  } // end if
  else
  {
    return createResponse(302, { "Location": default_destination },"");
  } // end else

} // end function