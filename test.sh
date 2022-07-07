
install_slack_cli() {
        slack_cli_name="slack-dev"
        if [ $# -gt 0 ]; then
                slack_cli_name=${1}
        fi
        echo $slack_cli_name
}

main() {
        set -e
        install_slack_cli "$@"
}

main "$@"
