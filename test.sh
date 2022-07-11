install_slack_cli() {
        # 
        # To get Release Candidate build, users are required to input version number, otherwise the installation will use the default dev build: slack_cli_dev_{Os}_{Arch}.tar.gz
        #
        

        if (! getopts "v:" opt); then
                echo -e "\n👋 Starting to download and install the Slack CLI (build: dev) and its dependencies..."
                echo -e "\n📦 Installing the Slack CLI (build: dev) \n"
                LATEST_SLACK_CLI_DEV_VERSION="dev"
                slack_cli_name="slack-dev"
                if [ $# -gt 0 ]; then
                        slack_cli_name=${1}
                fi
        else
                while getopts "v:" opt; do
                        case $opt in
                                v)
                                        echo -e "\n👋 Starting to download and install the Slack CLI (build: ${OPTARG}) and its dependencies..."
                                        echo -e "\n📦 Installing the Slack CLI (build: ${OPTARG})\n"
                                        LATEST_SLACK_CLI_DEV_VERSION=${OPTARG}
                                        #
                                        # The second positional parameter is the alias of Slack CLI, and 'shift' will simply move to the last argument
                                        #
                                        slack_cli_name="slack-dev"
                                        if [ $# -gt 2 ]; then
                                                shift $(($OPTIND - 1))
                                                slack_cli_name=${1}
                                        fi
                                        ;;
                                #
                                # This checks if option is correctly passed as "-v"
                                #
                                \?)
                                        echo "Invalid version option: -$OPTARG" >&2
                                        exit 1
                                        ;;
                                #
                                # This checks if version has argument 
                                #
                                :)
                                        echo "Slack-CLI requires a version number." >&2
                                        exit 1
                                        ;;
                        esac
                done
        fi

        if [ "$(uname)" == "Darwin" ]; then
                slack_cli_url="https://downloads.slack-edge.com/slack-cli/slack_cli_${LATEST_SLACK_CLI_DEV_VERSION}_macOS_64-bit.tar.gz"
        elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
                slack_cli_url="https://downloads.slack-edge.com/slack-cli/slack_cli_${LATEST_SLACK_CLI_DEV_VERSION}_linux_64-bit.tar.gz"
        else
                echo "This installer is only supported on Linux and macOS"
                exit 1
        fi
        
        
        echo "Downloading the Slack CLI (build: ${LATEST_SLACK_CLI_DEV_VERSION}): $slack_cli_url"
        
        echo "Adding a symbolic link /usr/local/bin/$slack_cli_name"
}

main() {
        set -e
        install_slack_cli "$@"
}

main "$@"
