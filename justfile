default:
    @just --list

install:
    pnpm install

dev:
    pnpm dev

check:
    pnpm check

build:
    pnpm build

test:
    pnpm test

lint:
    pnpm lint

format:
    pnpm format

coverage:
    pnpm test:coverage

docker:
    docker build -t bikespot .
    docker run --rm -p 8080:80 bikespot

clean:
    rm -rf dist/ coverage/
