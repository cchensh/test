#!/bin/bash

install_slack_cli() {
        echo -e "\n👋 Starting to download and install the Slack CLI and its dependencies..."

        #
        # Install Slack CLI
        #
        echo -e "\n📦 Installing the Slack CLI\n"

        slack_cli_url="https://downloads.slack-edge.com/slack-cli/slack_cli_1.13.0-evegeris_gen_trigger-feature_macOS_64-bit.tar.gz"
        

        slack_cli_name="slack"
        if [ $# -gt 0 ]; then
                slack_cli_name=${1}
        fi
        slack_cli_install_dir="$HOME/.slack"
        slack_cli_install_bin_dir="$slack_cli_install_dir/bin"
        slack_cli_bin_path="$slack_cli_install_bin_dir/slack"

        if [ ! -d "$slack_cli_install_dir" ]; then
                mkdir -p "$slack_cli_install_dir"
        fi

        echo "Downloading the Slack CLI: $slack_cli_url"
        curl -# -fLo "$slack_cli_install_dir/slack-cli.tar.gz" "$slack_cli_url"
        echo "Extracting the Slack CLI: $slack_cli_bin_path"
        tar -xf "$slack_cli_install_dir/slack-cli.tar.gz" -C "$slack_cli_install_dir"
        chmod +x "$slack_cli_bin_path"
        rm "$slack_cli_install_dir/slack-cli.tar.gz"
        echo "Adding a symbolic link /usr/local/bin/$slack_cli_name to $slack_cli_bin_path "

        if [ -w /usr/local/bin ]; then
                ln -sf "$slack_cli_bin_path" "/usr/local/bin/$slack_cli_name"
        else
                echo -e "Installer doesn't have write access to /usr/local/bin to create a symbolic link. Script will try with sudo privileges"
                sudo ln -sf "$slack_cli_bin_path" "/usr/local/bin/$slack_cli_name"
        fi

        if [ $(command -v $slack_cli_name) ]; then
                echo -e "\n✨ Slack CLI was installed successfully\n"
        else
                echo "Manually add the Slack CLI directory to your \$HOME/$shell_profile (or similar)"
                echo "  export PATH=\"$slack_cli_install_bin_dir:\$PATH\""
        fi
}

main() {
        set -e
        install_slack_cli "$@"
}
main "$@"