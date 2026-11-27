.PHONY: all run dev build install test help

all: run

help:
	@./run.sh help

run:
	@./run.sh

dev:
	@./run.sh dev

build:
	@./run.sh build

install:
	@./run.sh install

test:
	@./run.sh test
