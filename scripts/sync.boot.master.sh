#!/bin/sh


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



