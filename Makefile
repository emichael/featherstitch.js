.PHONY: clean serve clean-all build publish
.FORCE:

build: node_modules/
	npm run build

node_modules/:
	npm install

serve: node_modules/
	npm run-script server

publish: clean build
	# First, check to make sure the repo
	# TODO: check for files not in git index
	git diff --quiet && git diff --cached --quiet
	git checkout -b gh-pages
	mv dist/app.html dist/index.html
	git add -f dist/
	git commit -m "Publishing site on `date "+%Y-%m-%d %H:%M:%S"`"
	git filter-branch -f --subdirectory-filter dist/
	git push -f origin gh-pages:gh-pages
	git checkout master
	git branch -D gh-pages
	git branch -d -r origin/gh-pages
	git update-ref -d refs/original/refs/heads/gh-pages


clean:
	rm -rfv dist/ featherstitchjs.tar.gz

clean-all: clean
	rm -rfv node_modules/
