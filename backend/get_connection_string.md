# Cara Mendapatkan Connection String Standard MongoDB Atlas

## Langkah-langkah:

1. **Login ke MongoDB Atlas**: https://cloud.mongodb.com

2. **Pilih Cluster Anda** (Cluster0)

3. **Klik tombol "Connect"**

4. **Pilih "Drivers"**

5. **Di bagian connection string, klik "Show alternative connection string formats"**

6. **Copy connection string format STANDARD** (bukan SRV)
   
   Format SRV (JANGAN pakai ini jika ada masalah DNS):
   ```
   mongodb+srv://username:password@cluster0.lhmox.mongodb.net/...
   ```
   
   Format Standard (PAKAI ini):
   ```
   mongodb://username:password@cluster0-shard-00-00.lhmox.mongodb.net:27017,cluster0-shard-00-01.lhmox.mongodb.net:27017,cluster0-shard-00-02.lhmox.mongodb.net:27017/?ssl=true&replicaSet=atlas-xxxxxx-shard-0&authSource=admin&retryWrites=true&w=majority
   ```

7. **Update file .env dengan connection string standard tersebut**

