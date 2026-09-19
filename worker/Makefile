.PHONY: test

test: .venv
	.venv/bin/pytest -m "not linux_sandbox"

.venv:
	uv venv --python 3.12 --seed .venv && .venv/bin/pip install -r requirements.txt
