#!/bin/bash
cd my-app
if [ $# -gt 0 ]; then
    token=${1}
    # loc trigger create --trigger-def triggers/greeting_trigger.ts --token "${{ secrets.SLACK_TOKEN }}"
    hermes-dev login --auth $token
    sleep 3
    hermes-dev trigger create --trigger-def triggers/greeting_trigger.ts --token $token 
    sleep 3
    xdotool key down
    sleep 3
    xdotool key --clearmodifiers Return 
fi
