install_slack_cli() {
        if (! getopts "v:" opt); then
                echo "Slack-CLI requires a version number"
                exit 1
        fi
        while getopts ":v:" opt; do
                case $opt in
                        v)
                                echo -e "\n👋 Starting to download and install the Slack CLI and its dependencies..."
                                #
                                # Get the Slack CLI Release Candidate build version from input.
                                #
                                echo -e "\n Slack CLI Release Candidate build version is ${OPTARG}"
                                LATEST_SLACK_CLI_DEV_VERSION=${OPTARG}
                                #
                                # Install Slack CLI
                                #
                                echo -e "\n📦 Installing the Slack CLI\n"



                                if [ "$(uname)" == "Darwin" ]; then
                                        slack_cli_url="https://downloads.slack-edge.com/slack-cli/slack_cli_${LATEST_SLACK_CLI_DEV_VERSION}_macOS_64-bit.tar.gz"
                                        echo $slack_cli_url
                                elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
                                        slack_cli_url="https://downloads.slack-edge.com/slack-cli/slack_cli_${LATEST_SLACK_CLI_DEV_VERSION}_linux_64-bit.tar.gz"
                                        echo $slack_cli_url
                                else
                                        echo "This installer is only supported on Linux and macOS"
                                        exit 1
                                fi

                                slack_cli_name="slack-dev"
                                if [ $# -gt 1 ]; then
                                        shift $(($OPTIND - 1))
                                        slack_cli_name=${1}
                                fi
                                echo $slack_cli_name
                                ;;

                        \?)
                                echo "Invalid version option: -$OPTARG" >&2
                                exit 1
                                ;;
                        :)
                                echo "Slack-CLI requires a version number." >&2
                                exit 1
                                ;;
                esac
        done


}

main() {
        set -e
        install_slack_cli "$@"
}

main "$@"
