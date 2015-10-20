ifdef GREP
	GREPARG = -g $(GREP)
endif

REPORTER ?= spec
TESTS = ./tests
NPM_BIN = ./node_modules/.bin

jshint:
	$(NPM_BIN)/jshint lib tests

fixjsstyle:
	fixjsstyle -r lib -r test --strict --jslint_error=all

coverage:
	$(NPM_BIN)/istanbul cover $(NPM_BIN)/_mocha --report lcovonly -- --recursive -t 20000 --ui tdd $(TESTS)

test:
	$(NPM_BIN)/mocha --globals setImmediate,clearImmediate --check-leaks --colors -t 20000 --reporter $(REPORTER) $(TESTS) $(GREPARG)

.PHONY: jshint fixjsstyle coverage codeclimate-send test
