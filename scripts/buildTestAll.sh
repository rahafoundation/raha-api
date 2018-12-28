#!/usr/bin/env bash

(
  SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
  cd "$SCRIPT_DIR"

  for PACKAGE_DIR in "$( npm prefix )/packages/"*; do
    if [ -d "${PACKAGE_DIR}" ]; then
      (
        cd "${PACKAGE_DIR}"
        for CMD in "build" "test"; do
          echo "Running \`yarn ${CMD}\` in ${PACKAGE_DIR}..."
          yarn $CMD
          retval=$?
          if [ $retval -eq 0 ]; then
              echo "yarn ${CMD} for ${PACKAGE_DIR} succeeded."
              echo ""
          else
              echo "yarn ${CMD} for ${PACKAGE_DIR} failed."
              echo "Aborting"
              exit $retval
          fi
        done
      )
    fi
  done
)
