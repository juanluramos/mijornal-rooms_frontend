# Mijornal Rooms Frontend

Frontend básico sin build step para la API de `mijornalrooms`.

## Uso

1. Arranca el backend:

```bash
cd /opt/lampp/htdocs/mijornalrooms
npm start
```

2. Abre el frontend desde XAMPP:

```text
http://localhost/mijornalroomsFrontend/
```

Por defecto el navegador llama a `api-proxy.php`, que reenvía las peticiones a `http://127.0.0.1:3000`. Si necesitas otro backend, define `MIJORNALROOMS_API_BASE` en Apache/PHP o cambia el campo `API` en la interfaz a una URL directa.
