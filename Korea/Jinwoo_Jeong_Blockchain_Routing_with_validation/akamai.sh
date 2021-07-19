#!/bin/bash -x 

#DEF_OPT="--section ewcc"

if [[ $* == *"property"* ]]; then
    echo "property"
    DEF_OPT="--group grp_196983 --contract ctr_P-3L2XGZ1 --section ewcc"
    akamai $* $DEF_OPT
elif [[ $* == "auth" ]]; then
    DEF_OPT="edgeworkers auth ewcc02.ewcc.in --section ewcc  --expiry 60"
    auth_key=`akamai $DEF_OPT |  grep Akamai | sed 's/ //g'`
    # cat header| sed '$d' 
    sed -i '' '$d' header
    echo $auth_key >> header
fi





