#!/usr/bin/env bash
set -euo pipefail

cd /app

if [[ "${SKYTERRA_RUN_MIGRATIONS:-1}" == "1" ]]; then
  python manage.py migrate --noinput
fi

if [[ "${SKYTERRA_COLLECTSTATIC:-1}" == "1" ]]; then
  python manage.py collectstatic --noinput
fi

if [[ "${CREATE_ADMIN_ON_STARTUP:-1}" == "1" ]]; then
  python manage.py create_default_admin
fi

exec "$@"
