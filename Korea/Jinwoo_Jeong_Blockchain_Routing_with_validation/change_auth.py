#!/usr/bin/env python3
import os

auth_key = os.popen('akamai edgeworkers auth ewcc02.ewcc.in --section ewcc  --expiry 60 | grep "EW-Trace" | cut -d ":" -f2').read().strip()
auth_keyword = "Akamai-EW-Trace"

print(f"new auth_key = {auth_keyword}:{auth_key}")

with open("header", 'r+') as header_file:
    lines = header_file.readlines()
    header_file.seek(0)
    header_file.truncate()

    for line in lines:
        if auth_keyword in line:
            header_file.write(f"{auth_keyword}:{auth_key}")
        else:
            header_file.write(line)

