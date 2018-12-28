#!/usr/bin/env bash

(
  SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
  cd "$SCRIPT_DIR"

  for PACKAGE_DIR in "$( npm prefix )/packages/"*; do
    if [ -d "${PACKAGE_DIR}" ]; then
      (
        cd "${PACKAGE_DIR}"
        echo "Running \`yarn test\` in ${PACKAGE_DIR}..."
        yarn test
        retval=$?
        if [ $retval -eq 0 ]; then
            echo "Tests for ${PACKAGE_DIR} succeeded."
            echo ""
        else
            echo "Tests for ${PACKAGE_DIR} failed."
            echo "Aborting"
            exit $retval
        fi
      )
    fi
  done
)
