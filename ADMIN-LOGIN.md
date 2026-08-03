# Lootifer admin-login

## Eenmalig instellen

Open een terminal in de hoofdmap van Funko-shop:

```powershell
npm install
npm run setup-admin
```

Kies een gebruikersnaam en een wachtwoord van minimaal 10 tekens. Het wachtwoord wordt gehasht opgeslagen in `Data/admin-auth.json`. Dit bestand staat in `.gitignore` en mag niet naar GitHub.

## Starten

```powershell
npm start
```

Start daarna Live Server en open:

```text
http://127.0.0.1:5500/admin/login.html
```

De adminsessie verloopt standaard na 8 uur. Gebruik **Uitloggen** in de beheerbalk om de sessie direct te beëindigen.
