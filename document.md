# Documentation des erreurs de sécurité

## Analyse SonarQube

![Capture de SonarQube avant la correction des erreurs de sécurité](image_document/SonarErreur.png)

Ce document présente les principales vulnérabilités détectées dans l’application à l’aide de SonarQube.

---

### 1. Jetons JWT exposés en clair

**Fichiers concernés :**
- frontend/src/app/app.guard.spec.ts (ligne 38)
- frontend/src/app/last-login-ip/last-login-ip.component.spec.ts (ligne 61)

Description : JWT présent en clair dans le code source.

---

### 2. Clé privée exposée dans le code

**Fichier concerné :**
- lib/insecurity.ts (ligne 23)

Description : Clé privée laissée en clair dans le code.

---

### 3. Exécution dynamique de code influencé par l’utilisateur

**Fichiers concernés :**
- routes/b2bOrder.ts (lignes 19 à 23)
- routes/createProductReviews.ts (lignes 23, 26)
- server.ts (ligne 304)
- routes/fileUpload.ts (lignes 79 à 83, 112, 116)
- routes/likeProductReviews.ts (lignes 18, 25, 35, 36, 43, 50, 51)
- routes/commande.ts (lignes 154, 156)
- routes/orderHistory.ts (ligne 36)
- routes/redirect.ts (lignes 15, 19)
- routes/showProductReviews.ts (lignes 31 à 36)
- routes/trackOrder.ts (lignes 15 à 18)
- routes/updateProductReviews.ts (ligne 17)

Description : Exécution de code à partir de données contrôlées par l’utilisateur.

---

### 4. Construction de chemins ou d’URL à partir de données utilisateur

**Fichiers concernés :**
- routes/fileUpload.ts (lignes 40, 41, 45)
- routes/profileImageUrlUpload.ts (lignes 19, 24)
- routes/vulnCodeFixes.ts (lignes 71, 81)
- routes/vulnCodeSnippet.ts (lignes 71, 90)

Description : Chemins de fichiers ou URLs construits à partir de données utilisateur.

---

### 5. Construction de requêtes SQL à partir de données utilisateur

**Fichiers concernés :**
- routes/login.ts (ligne 34)
- routes/search.ts (lignes 21 à 23)

Description : Requêtes SQL construites directement à partir de données utilisateur.

---

## Correction des erreurs Analyser par SonarQube

### Correction : Exécution dynamique de code influencé par l’utilisateur dans routes/trackOrder.ts

Le paramètre id est désormais validé comme alphanumérique/tiret uniquement et l’utilisation dangereuse de $where a été supprimée au profit d’une requête MongoDB classique. Cela empêche toute injection ou exécution de code via ce paramètre.

### Correction : Exécution dynamique de code influencé par l’utilisateur dans routes/showProductReviews.ts

Le paramètre id est désormais validé comme strictement numérique et l’utilisation dangereuse de $where a été supprimée au profit d’une requête MongoDB classique. Cela empêche toute injection ou exécution de code via ce paramètre.

### Correction : Exécution dynamique de code influencé par l’utilisateur dans routes/updateProductReviews.ts

Le paramètre id est désormais validé comme un ObjectId MongoDB valide (24 caractères hexadécimaux) et le champ message est nettoyé (suppression de balises HTML et de caractères spéciaux dangereux) avant d’être inséré en base. Cela empêche toute tentative d’injection NoSQL ou de contenu malveillant via ces champs.

### Correction : Exécution dynamique de code influencé par l’utilisateur dans routes/redirect.ts

Le paramètre to est désormais validé comme une URL correcte et nettoyé avant toute redirection. Cela empêche toute redirection ouverte ou manipulation dangereuse via ce paramètre.

### Correction : Exécution dynamique de code influencé par l’utilisateur dans routes/orderHistory.ts

L’email et l’id utilisateur sont désormais validés et nettoyés avant d’être utilisés dans la requête. Cela empêche toute tentative d’injection ou d’abus via ces champs.

### Correction : Exécution dynamique de code influencé par l’utilisateur dans routes/likeProductReviews.ts

L’id reçu est désormais validé (doit être un ObjectId valide) et l’email utilisateur est nettoyé avant d’être ajouté à la liste likedBy. Cela empêche toute tentative d’injection ou d’abus via ces champs.

### Correction : Exécution dynamique de code influencé par l’utilisateur et construction de chemins dans routes/fileUpload.ts

L’exécution dynamique de code utilisateur via vm a été supprimée dans handleXmlUpload et handleYamlUpload. Les fichiers sont désormais parsés directement sans exécution de code. Dans handleZipFileUpload, la construction du chemin d’extraction est sécurisée pour empêcher toute écriture en dehors du dossier prévu.

### Correction : Exécution dynamique de code influencé par l’utilisateur dans routes/createProductReviews.ts

Les champs message et author sont désormais nettoyés (suppression de balises HTML et de caractères spéciaux dangereux) avant d’être insérés en base. Cela empêche toute tentative d’injection ou de contenu malveillant via ces champs.

### Correction : Exécution dynamique de code influencé par l’utilisateur dans routes/b2bOrder.ts

L’exécution dynamique de code utilisateur via safeEval a été supprimée. L’entrée orderLinesData est désormais uniquement acceptée si elle est un JSON valide, sans aucune exécution dynamique. Cela empêche toute injection de code malveillant par l’utilisateur.

### Correction : Construction de chemins ou d’URL à partir de données utilisateur dans routes/profileImageUrlUpload.ts

Le paramètre imageUrl est désormais validé pour n’accepter que des URLs http(s) valides, sans séquences de traversée de répertoire (..), et seules les extensions de fichiers d’images autorisées sont acceptées. Cela empêche toute attaque SSRF, traversée de chemin ou injection via ce champ.

### Correction : Construction de chemins à partir de données utilisateur dans routes/vulnCodeFixes.ts

Les accès aux fichiers sont désormais sécurisés par une validation stricte des noms de fichiers et de clés (aucune traversée de répertoire possible, seuls les caractères sûrs sont acceptés). Cela empêche toute tentative de lecture ou d’écriture de fichiers non autorisés via des chemins construits à partir de données utilisateur.

### Correction : Construction de chemins à partir de données utilisateur dans routes/vulnCodeSnippet.ts

La clé utilisée pour accéder aux fichiers est désormais validée pour n’accepter que des caractères sûrs (aucune traversée de répertoire possible). Cela empêche toute tentative d’accès à des fichiers non autorisés via des chemins construits à partir de données utilisateur.

### Correction : Construction de requêtes SQL à partir de données utilisateur dans routes/login.ts

Les champs email et password sont désormais validés et nettoyés avant d’être utilisés dans la requête SQL. Cela empêche toute tentative d’injection SQL via ces champs.

### Correction : Construction de requêtes SQL à partir de données utilisateur dans routes/search.ts

Le critère de recherche est désormais validé et nettoyé avant d’être utilisé dans la requête SQL. Cela empêche toute tentative d’injection SQL via ce champ.

### Correction : Clé privée exposée en clair dans lib/insecurity.ts

La clé privée utilisée dans le code (ligne 23) est désormais lue depuis la variable d’environnement PRIVATE_KEY, définie dans un fichier .env ou dans l’environnement d’exécution. Cela évite d’exposer une clé sensible en clair dans le code source.

### Correction : Jeton JWT exposé en clair dans last-login-ip.component.spec.ts

Le JWT utilisé dans le test unitaire (ligne 61) est désormais lu depuis la variable d’environnement TEST_JWT_LAST_LOGIN_IP, définie dans un fichier .env ou dans l’environnement d’exécution. Cela évite d’exposer un jeton en clair dans le code source.

### Correction : Jeton JWT exposé en clair dans app.guard.spec.ts

Le JWT utilisé dans le test unitaire (ligne 38) est désormais lu depuis la variable d’environnement TEST_JWT, définie dans un fichier .env ou dans l’environnement d’exécution. Cela évite d’exposer un jeton en clair dans le code source.

