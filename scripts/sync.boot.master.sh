#!/bin/sh

# check if a remote named boot already exists, and only add it if it doesn't
git remote get-url boot 2>/dev/null || git remote add boot git@github.com:bootloader/boot-express.git

# Fetch all branches from the 'boot' remote
git fetch boot

# Check if local branch 'boot_master' exists
if git show-ref --verify --quiet refs/heads/boot_master; then
    # If it exists, just check it out
    git checkout boot_master
else
    # If it doesn't exist, create it from boot/master
    git checkout -b boot_master boot/master
fi

git pull --rebase boot master

git checkout master

git pull --rebase origin master


git merge boot_master



