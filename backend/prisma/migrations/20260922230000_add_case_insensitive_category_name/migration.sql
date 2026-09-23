CREATE UNIQUE INDEX "Category_userId_name_ci_key"
ON "Category" ("userId", lower("name"));
