#!/bin/bash

MIN_DENO_VERSION="1.20.6"

install_slack_cli() {
        FINGERPRINT="d41d8cd98f00b204e9800998ecf8427e"    

        slack_cli_name="slack"
        if [ $# -gt 0 ]; then
                slack_cli_name=${1}
        fi

        # Check if slack command is already in user's system
        if [ -x "$(command -v $slack_cli_name)" ] ; then
                echo -e "✅ $slack_cli_name command is found in the system. Now check if it's Slack CLI command\n"
                
                # Check if command is used for Slack CLI, adding version check to make sure this change is backwards compatible
                if [[  $slack_cli_name --version -eq 0 ]] ; then
                        if [[ ! $($slack_cli_name --version) == *"Using $slack_cli_name v"* ]]; then
                                echo -e "✋ We found another $slack_cli_name command in your system, please pass your preferred alias in the install script to avoid name conflicts\n\n curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash -s your-preferred-alias\n"
                                exit 1
                        fi
                elif [[ $slack_cli_name _fingerprint -eq 0 ]] ; then
                        if [[ ! $($slack_cli_name _fingerprint) == $FINGERPRINT ]] ; then
                                echo -e "✋ We found another $slack_cli_name command in your system, please pass your preferred alias in the install script to avoid name conflicts\n\n curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash -s your-preferred-alias\n"
                                exit 1
                        fi
                else
                        echo -e "✋ We found another $slack_cli_name command in your system, please pass your preferred alias in the install script to avoid name conflicts\n\n curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash -s your-preferred-alias\n"
                        exit 1
                fi
        fi

        echo -e "\n👋 Starting to download and install the Slack CLI and its dependencies..."

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

        #
        # Install Slack CLI
        #
        echo -e "\n📦 Installing the Slack CLI\n"

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
        else
                echo -e "✨ Deno is up-to-date. Nice!"
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
                echo -e "📦 You have Visual Studio Code installed. Adding deno extension to enhance your development experience.\n"
                code --install-extension denoland.vscode-deno
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
