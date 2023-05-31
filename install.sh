#!/bin/bash

MIN_DENO_VERSION="1.31.1"

install_slack_cli() {
        FINGERPRINT="d41d8cd98f00b204e9800998ecf8427e"    

        slack_cli_name="slack"
        if [ $# -gt 0 ]; then
                slack_cli_name=${1}
        fi

        

        # Check if slack binary is already in user's system
        if [ -x "$(command -v $slack_cli_name)" ] ; then
                echo -e "✅ $slack_cli_name binary is found in the system. Checking if it's the same Slack CLI..."
                
                # Check if command is used for Slack CLI, for Slack CLI with version >= 1.18.0, the fingerprint needs to be matched to proceed installation
                if [[ ! $($slack_cli_name _fingerprint) == $FINGERPRINT ]] &>/dev/null ; then

                        # For Slack CLI with version < 1.18.0, we check with `slack --version` for backwards compatibility  
                        if [[ ! $($slack_cli_name --version) == *"Using $slack_cli_name v"* ]]; then
                                echo -e "✋ We found another $slack_cli_name command in your system, please pass your preferred alias in the install script to avoid name conflicts\n\n See example below: \n\ncurl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash -s your-preferred-alias\n"
                                exit 1
                        fi
                fi
        fi

        #       
        # Install Slack CLI
        #
        if (! getopts "v:" opt); then
                #
                # Get the latest published Slack CLI release, the latest release is the most recent non-prerelease, non-draft release, sorted by the created_at attribute.
                # Using grep and sed to parse the semver (excluding "v" to ensure consistence of binaries' filenames ) instead of jq to avoid extra dependencies requirement
                #
                echo -e "\n Finding the latest Slack CLI release version"
                LATEST_SLACK_CLI_VERSION=$(curl --silent "https://api.slack.com/slackcli/metadata.json" | grep -o '"version": "[^"]*' | grep -o '[^"]*$' | head -1)

                if [ -z "$LATEST_SLACK_CLI_VERSION" ]; then
                        echo "Installer cannot find latest Slack CLI release version"
                        exit 1
                fi

                echo -e "\n👋 Starting to download and install the Slack CLI and its dependencies..."
                echo -e "\n📦 Installing the Slack CLI\n"
        else
                while getopts "v:" opt; do
                        case $opt in
                                v)
                                        echo -e "\n👋 Starting to download and install the Slack CLI (version: ${OPTARG}) and its dependencies..."
                                        echo -e "\n📦 Installing the Slack CLI (version: ${OPTARG})\n"
                                        LATEST_SLACK_CLI_VERSION=${OPTARG}
                                        #
                                        # The second positional parameter is the alias of Slack CLI, and 'shift' will simply move to the last argument
                                        #
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
                slack_cli_url="https://downloads.slack-edge.com/slack-cli/slack_cli_${LATEST_SLACK_CLI_VERSION}_macOS_64-bit.tar.gz"
        elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
                slack_cli_url="https://downloads.slack-edge.com/slack-cli/slack_cli_${LATEST_SLACK_CLI_VERSION}_linux_64-bit.tar.gz"
        else
                echo "This installer is only supported on Linux and macOS"
                exit 1
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

# Originally from https://gist.github.com/jonlabelle/6691d740f404b9736116c22195a8d706
# Echos the inputs, breaks them into separate lines, then sort by semver descending,
# then takes the first line. If that is not the first param, that means $1 < $2
version_lt() {
  test "$(echo "$@" | tr " " "\n" | sort -rV | head -n 1)" != "$1";
}

maybe_update_deno_version(){
        current_deno_version=$(deno -V | cut -d " " -f2)
        if version_lt $current_deno_version $MIN_DENO_VERSION; then
                echo "Deno $current_deno_version was found, but at least $MIN_DENO_VERSION is required."
                echo -e "⛑️ Visit https://deno.com/manual/getting_started/installation to update Deno\n"
        else
                echo -e "✨ Deno is installed and meets minimum version requirement. Nice!\n"
        fi
}

install_deno() {
        echo -e "📦 Checking dependency: Deno\n"

        #
        # Install dependency: deno
        #
        if [ $(command -v deno) ]; then
                maybe_update_deno_version
        else 
                echo -e "⛑️ Deno is not found in your system. Visit https://deno.com/manual/getting_started/installation to update Deno\n"
        fi
}

install_deno_vscode_extension() {
        if [ -f "$(command -v code)" ]; then
                echo -e "📦 You have Visual Studio Code installed. Run command below to install deno extension to enhance your development experience.\n"
                echo -e "   code --install-extension denoland.vscode-deno"
        fi
}

feedback_message() {
        if [ $(command -v $slack_cli_name) ]; then
                echo -e "\n💌 We would love to know how things are going. Really. All of it."
                echo -e "   Survey your development experience with \`$slack_cli_name feedback\`"
        fi
}

terms_of_service() {
        if [ $(command -v $slack_cli_name) ]; then
                echo -e "\n📄 Use of the Slack CLI should comply with the Slack API Terms of Service:"
                echo -e "   https://slack.com/terms-of-service/api"
        fi
}

next_step_message() {
        if [ $(command -v deno) ] && [ $(command -v $slack_cli_name) ]; then
                echo -e "\n✨ You're all set! Next, authorize your CLI in your workspace with \`$slack_cli_name login\`\n"
        fi
}

main() {
        set -e
        install_slack_cli "$@"
        install_deno
        install_deno_vscode_extension
        feedback_message
        terms_of_service
        next_step_message
}

main "$@"
