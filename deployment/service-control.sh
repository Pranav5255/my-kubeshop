#!/bin/bash

COMMAND=$1

case $COMMAND in
  start)
    echo "Starting services..."
    sudo systemctl start urumi-backend
    sudo systemctl start nginx
    ;;
  stop)
    echo "Stopping services..."
    sudo systemctl stop urumi-backend
    ;;
  restart)
    echo "Restarting services..."
    sudo systemctl restart urumi-backend
    sudo systemctl restart nginx
    ;;
  status)
    echo "=== Backend Status ==="
    sudo systemctl status urumi-backend --no-pager
    echo ""
    echo "=== Nginx Status ==="
    sudo systemctl status nginx --no-pager
    ;;
  logs)
    echo "Showing backend logs (Ctrl+C to exit):"
    sudo journalctl -u urumi-backend -f
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
