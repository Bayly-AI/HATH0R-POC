.PHONY: install test test-pre-deploy test-post-deploy

install:
	npm install

test:
	npm run test

test-pre-deploy:
	npx vitest run --coverage

test-post-deploy:
	npm run test:smoke
