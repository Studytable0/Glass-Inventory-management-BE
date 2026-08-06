[1mdiff --git a/src/app.js b/src/app.js[m
[1mindex 37c375e..d088789 100644[m
[1m--- a/src/app.js[m
[1m+++ b/src/app.js[m
[36m@@ -18,8 +18,10 @@[m [mapp.use(morgan("dev"));[m
 app.use(express.json());[m
 [m
 // Initialize Database Tables[m
[31m-initProductTables();[m
[31m-initGlassCategoryTable();[m
[32m+[m[32m(async () => {[m
[32m+[m[32m    await initGlassCategoryTable();[m
[32m+[m[32m    await initProductTables();[m
[32m+[m[32m})();[m
 [m
 // Routes[m
 app.use("/api/auth", authRouter);[m
[36m@@ -43,4 +45,4 @@[m [mapp.get("/api/profile", authenticate, (req, res)=> {[m
     });[m
 });[m
 [m
[31m-export default app;[m
\ No newline at end of file[m
[32m+[m[32mexport default app;[m
[1mdiff --git a/src/db.sql b/src/db.sql[m
[1mindex 5c5efdb..917cdd5 100644[m
[1m--- a/src/db.sql[m
[1m+++ b/src/db.sql[m
[36m@@ -1,4 +1,3 @@[m
[31m--- Creating User[m
 CREATE TABLE users ([m
     id SERIAL PRIMARY KEY,[m
     store_id INT,[m
[36m@@ -12,7 +11,6 @@[m [mCREATE TABLE users ([m
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP[m
 );[m
 [m
[31m--- Creating stores[m
 CREATE TABLE stores ([m
     store_id SERIAL PRIMARY KEY,[m
     store_email VARCHAR(255) UNIQUE NOT NULL,[m
[36m@@ -21,7 +19,6 @@[m [mCREATE TABLE stores ([m
     status BOOLEAN DEFAULT true,[m
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP[m
 );[m
[31m-[m
 -- Creating glass_categories table[m
 CREATE TABLE glass_categories ([m
     id SERIAL PRIMARY KEY,[m
