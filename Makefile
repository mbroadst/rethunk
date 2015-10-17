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

test: jshint
	$(NPM_BIN)/mocha --globals setImmediate,clearImmediate --check-leaks --colors -t 10000 --reporter $(REPORTER) $(TESTS) $(GREPARG)

.PHONY: jshint fixjsstyle test
