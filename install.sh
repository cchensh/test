#!/bin/bash

MIN_DENO_VERSION="1.31.1"
SKIP_DENO_INSTALL=false
SLACK_CLI_NAME="slack"
FINGERPRINT="d41d8cd98f00b204e9800998ecf8427e" 
SLACK_CLI_VERSION=
rx='^([0-9]+\.){2}(\*|[0-9]+)(-.*)?$'

while getopts "v:d" flag; do
        case "$flag" in
                v) 
                        if [[ $OPTARG =~ $rx ]]; then
                                SLACK_CLI_VERSION=$OPTARG
                        else
                                echo "Slack-CLI requires a valid semver version number." >&2
                                exit 1
                        fi
                        ;;
                d) 
                        SKIP_DENO_INSTALL=true
                        ;;
        esac
done

if [ $(( $# - $OPTIND )) -lt 1 ]; then
    SLACK_CLI_NAME=${@:$OPTIND:1}
fi

install_slack_cli() {
        #       
        # Install Slack CLI
        #
        if [ -z "$SLACK_CLI_VERSION" ]; then
                #
                # Get the latest published Slack CLI release, the latest release is the most recent non-prerelease, non-draft release, sorted by the created_at attribute.
                # Using grep and sed to parse the semver (excluding "v" to ensure consistence of binaries' filenames ) instead of jq to avoid extra dependencies requirement
                #
                echo -e "\n Finding the latest Slack CLI release version"
                SLACK_CLI_VERSION=$(curl --silent "https://api.slack.com/slackcli/metadata.json" | grep -o '"version": "[^"]*' | grep -o '[^"]*$' | head -1)

                if [ -z "$SLACK_CLI_VERSION" ]; then
                        echo "Installer cannot find latest Slack CLI release version"
                        exit 1
                fi
        fi

                # Check if slack binary is already in user's system
        if [ -x "$(command -v $SLACK_CLI_NAME)" ] ; then
                echo -e "✅ $SLACK_CLI_NAME binary is found in the system. Checking if it's the same Slack CLI..."
                
                # Check if command is used for Slack CLI, for Slack CLI with version >= 1.18.0, the fingerprint needs to be matched to proceed installation
                if [[ ! $($SLACK_CLI_NAME _fingerprint) == $FINGERPRINT ]] &>/dev/null ; then

                        # For Slack CLI with version < 1.18.0, we check with `slack --version` for backwards compatibility  
                        if [[ ! $($SLACK_CLI_NAME --version) == *"Using $SLACK_CLI_NAME v"* ]]; then
                                echo -e "✋ We found another $SLACK_CLI_NAME command in your system, please pass your preferred alias in the install script to avoid name conflicts\n\n See example below: \n\ncurl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash -s your-preferred-alias\n"
                                exit 1
                        fi
                fi
        fi

        echo -e "\n👋 Starting to download and install the Slack CLI and its dependencies..."
        echo -e "\n📦 Installing the Slack CLI v$SLACK_CLI_VERSION\n"

        if [ "$(uname)" == "Darwin" ]; then
                slack_cli_url="https://downloads.slack-edge.com/slack-cli/slack_cli_${SLACK_CLI_VERSION}_macOS_64-bit.tar.gz"
        elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
                slack_cli_url="https://downloads.slack-edge.com/slack-cli/slack_cli_${SLACK_CLI_VERSION}_linux_64-bit.tar.gz"
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
        echo "Adding a symbolic link /usr/local/bin/$SLACK_CLI_NAME to $slack_cli_bin_path "

        if [ -w /usr/local/bin ]; then
                ln -sf "$slack_cli_bin_path" "/usr/local/bin/$SLACK_CLI_NAME"
        else
                echo -e "Installer doesn't have write access to /usr/local/bin to create a symbolic link. Script will try with sudo privileges"
                sudo ln -sf "$slack_cli_bin_path" "/usr/local/bin/$SLACK_CLI_NAME"
        fi

        if [ $(command -v $SLACK_CLI_NAME) ]; then
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

deno_real_binary_path() {
        deno_bin=`which deno`
        if [ $(command -v realpath) ]; then
                realpath $deno_bin
                return
        fi
        if [ -L $deno_bin ]; then
                readlink $deno_bin
                return
        fi
        echo $deno_bin
}

deno_install_source() {
        if [ $(command -v brew) ]; then
                brew ls deno --versions &>/dev/null
                if [ $? -eq 0 ]; then
                        echo "brew"
                        return
                fi
        fi
        if [ $(deno_real_binary_path) == "$HOME/.deno/bin/deno" ]; then
                echo "deno-install-sh"
                return
        fi
        echo "unknown"
}

maybe_update_deno_version(){
        current_deno_version=$(deno -V | cut -d " " -f2)
        if version_lt $current_deno_version $MIN_DENO_VERSION; then
                if [ "$SKIP_DENO_INSTALL" = true ]; then
                        echo -e "⚠️ Deno $current_deno_version was found, but at least $MIN_DENO_VERSION is required."
                        echo -e "  To update a previously installed version of Deno, you can run: "
                        echo -e "    deno upgrade "
                else
                        echo "Deno $current_deno_version was found, but at least $MIN_DENO_VERSION is required."
                        install_source=$(deno_install_source)
                        case $install_source in
                                "brew")
                                        echo "Upgrading Deno using Homebrew..."
                                        brew upgrade deno
                                        ;;
                                "deno-install-sh")
                                        echo "Upgrading Deno using 'deno upgrade'.."
                                        deno upgrade --version $MIN_DENO_VERSION
                                        ;;
                                *)
                                        echo "Can't detect how Deno was installed."
                                        echo "We can attempt to run 'deno upgrade' anyway. This may not work if you installed deno via a package manager."
                                        read -p "Run 'deno upgrade'? " yn
                                        case $yn in
                                                [Yy]*) deno upgrade --version $MIN_DENO_VERSION ;;
                                                *)
                                                        echo "Please upgrade deno manually to at least $MIN_DENO_VERSION and re-run this script."
                                                        exit
                                                        ;;
                                        esac
                                        ;;
                        esac
                fi
        else
                echo -e "✨ Deno is installed and meets the minimum version requirement. Nice!\n"
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
                if [ "$SKIP_DENO_INSTALL" = true ]; then
                        echo -e "⚠️ Deno was not found on your system!"
                        echo -e "  Visit https://deno.com/manual/getting_started/installation to install Deno\n"
                else
                        if [ $(command -v brew) ]; then
                                echo "Installing Deno using Homebrew..."
                                brew install deno
                        else
                                if [ ! $(command -v unzip) ]; then
                                        #
                                        # Install dependency: unzip
                                        #
                                        if [ $(command -v apt-get) ]; then
                                                echo "Installing unzip"
                                                sudo apt-get install unzip
                                        elif [ $(command -v yum) ]; then
                                                echo "Installing unzip"
                                                sudo yum install unzip
                                        fi
                                fi
                                curl -fsSL https://deno.land/install.sh | sh -s v$MIN_DENO_VERSION
                        fi
                fi
        fi

        if [ ! $(command -v deno) ]; then
                deno_path="${DENO_INSTALL:-$HOME/.deno/bin/deno}"
                if [ -f "$deno_path" ]; then
                        echo "Adding a symbolic link /usr/local/bin/deno to $deno_path"
                        if [ -w /usr/local/bin ]; then
                                ln -sf "$deno_path" /usr/local/bin/deno
                        else
                                echo -e "Installer doesn't have write access to /usr/local/bin to create a symbolic link. Script will try with sudo privileges"
                                sudo ln -sf "$deno_path" /usr/local/bin/deno
                        fi
                fi
        fi

        if [ $(command -v deno) ]; then
                echo -e "✨ Deno is installed and ready!\n"
        fi
}

install_deno_vscode_extension() {
        if [ -f "$(command -v code)" ]; then
                if [ "$SKIP_DENO_INSTALL" = true ]; then
                        echo -e "📦 You have the Visual Studio Code editor installed!\n"
	                echo -e "   Install the Deno extension with the following command to enhance your development experience:\n"
	                echo -e "   code --install-extension denoland.vscode-deno"
                else
                        echo -e "📦 You have the Visual Studio Code editor installed!\n"
                        echo -e "   Adding deno extension to enhance your development experience.\n"
                        code --install-extension denoland.vscode-deno
                fi
        fi
}

feedback_message() {
        if [ $(command -v $SLACK_CLI_NAME) ]; then
                echo -e "\n💌 We would love to know how things are going. Really. All of it."
                echo -e "   Survey your development experience with \`$SLACK_CLI_NAME feedback\`"
        fi
}

terms_of_service() {
        if [ $(command -v $SLACK_CLI_NAME) ]; then
                echo -e "\n📄 Use of the Slack CLI should comply with the Slack API Terms of Service:"
                echo -e "   https://slack.com/terms-of-service/api"
        fi
}

next_step_message() {
        if [ $(command -v deno) ] && [ $(command -v $SLACK_CLI_NAME) ]; then
                echo -e "\n✨ You're all set! Next, authorize your CLI in your workspace with \`$SLACK_CLI_NAME login\`\n"
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
