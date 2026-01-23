#!/bin/sh
set -e

# Default PORT to 80 if not provided (for local testing)
PORT=${PORT:-80}

# Replace ${PORT} in template with actual PORT value
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Nginx configured to listen on port ${PORT}"

# Start nginx
exec nginx -g "daemon off;"
