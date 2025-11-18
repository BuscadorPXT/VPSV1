#!/bin/bash
DATABASE_URL=$(grep "^DATABASE_URL=" .env | head -1 | cut -d '=' -f2- | tr -d '"')
export DATABASE_URL
node check-online-users.js
