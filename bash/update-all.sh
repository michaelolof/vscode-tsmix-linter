npm run compile
git-commit.sh $1
vsce package
git push origin master
