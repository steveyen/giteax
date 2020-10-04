REPOS_DIR = ~/gitea-repositories
REPO_USER = unknown
REPO_NAME = unknown
REPO_BRANCH = master

TMP_DIR = /tmp/giteax-tmp

TMP_REPO_USER_NAME = $(TMP_DIR)/$(REPO_USER)/$(REPO_NAME)

repo-init:
	rm -rf $(TMP_DIR)/*
	mkdir -p $(TMP_DIR)/$(REPO_USER)
	git clone $(REPOS_DIR)/$(REPO_USER)/$(REPO_NAME).git $(TMP_REPO_USER_NAME)
	cp cb-config-init.yaml $(TMP_REPO_USER_NAME)/cb-config.yaml
	git -C $(TMP_REPO_USER_NAME) add cb-config.yaml
	git -C $(TMP_REPO_USER_NAME) commit -m "first commit"
	git -C $(TMP_REPO_USER_NAME) push -u origin $(REPO_BRANCH)
