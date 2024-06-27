var express = require('express');
var mysql = require('mysql');
var cors = require('cors');
var multer = require('multer');
var path = require('path');
var fileUpload = require('express-fileupload');



var app = express();
app.use(express.json());
app.use(cors());
app.use(fileUpload());


//  Especiica el origen exacto (recomendado para producción)
var corsOptions = {
    origin: 'http://localhost:5173',  // Asegúrate que este sea el puerto y protocolo donde se ejecuta tu cliente Vue.js
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// parametros para la conexion
var conexion = mysql.createConnection({
    host: 'localhost',
    user:'root',
    password:'',
    database:'seguimiento_db'
});

// probamos la conexion
conexion.connect(function(error){
if(error)
    {
        throw error;
    }else{
        console.log("La conexión a la base de datos es exitosa");
    }
});


app.get('/', function(req, res){
    res.send('ruta INICIO')
})

// mostrar todos las personas
app.get('/api/persona',(req,res) =>{
    conexion.query('SELECT * FROM persona', (error, filas)=>{
        if(error){
            throw error;
        }else{
            res.send(filas);
        }
    })
})


// mostrar solo una persona por el número de documento
app.get('/api/buscar-estudiante/:num_doc',(req,res) =>{
    const numDoc = req.params.num_doc;
    const query = `
    SELECT 
    estudiante.Carnet AS num_doc,
    estudiante.Nombre AS nombre,
    estudiante.Apellido AS apellidoPersona,
    estudiante.Fecha_N AS fecha_nacimiento,
    tramite.Cod_Empaste AS codigo_empaste,
    tramite.Inicio_Tramite AS inicio_tramite,
    tramite.Estado AS estado,
    tramite.Etapa AS etapa_tramite,
    programa.Nombre AS programa,
    programa.Tipo AS tipo,
    sede.Nombre AS sede,
    inscripcion.fechaInscripcion AS fechaInscripcion
FROM 
    seguimiento_db.estudiante AS estudiante
JOIN 
    seguimiento_db.tramite AS tramite ON estudiante.Cod_Estudiante = tramite.Cod_Estudiante
JOIN 
    seguimiento_db.inscripcion AS inscripcion ON estudiante.Cod_Estudiante = inscripcion.Cod_Estudiante
JOIN 
    seguimiento_db.programa AS programa ON inscripcion.Cod_Programa = programa.Cod_Programa
JOIN 
    seguimiento_db.sede AS sede ON programa.Cod_Sede = sede.Cod_Sede
WHERE 
    seguimiento_db.estudiante.Carnet = ?;
        `;
        conexion.query(query, [numDoc], (error, resultados)=>{
        if (error) {
            console.error('Error al consultar la base de datos:', error);
            return res.status(500).send('Error interno del servidor');
        }

        if (resultados.length > 0) {
            res.send(resultados[0]);
        } else {
            res.status(404).send('Persona no encontrada');
        }
    })
})


// mostrar a todos los estudiantes
app.get('/api/buscar-estudiante-inscrito',(req,res) =>{
    const query = `
    SELECT 
    estudiante.Cod_Estudiante AS cod_estudiante,
    estudiante.Carnet AS num_doc,
    estudiante.Nombre AS nombre,
    estudiante.Apellido AS apellidoPersona,
    estudiante.Fecha_N AS fecha_nacimiento,
    tramite.Cod_Empaste AS codigo_empaste,
    tramite.Inicio_Tramite AS inicio_tramite,
    tramite.Estado AS estado,
    tramite.Etapa AS etapa_tramite,
    programa.Nombre AS programa,
    programa.Tipo AS tipo,
    sede.Nombre AS sede,
    inscripcion.fechaInscripcion AS fechaInscripcion
FROM 
    seguimiento_db.estudiante AS estudiante
JOIN 
    seguimiento_db.tramite AS tramite ON estudiante.Cod_Estudiante = tramite.Cod_Estudiante
JOIN 
    seguimiento_db.inscripcion AS inscripcion ON estudiante.Cod_Estudiante = inscripcion.Cod_Estudiante
JOIN 
    seguimiento_db.programa AS programa ON inscripcion.Cod_Programa = programa.Cod_Programa
JOIN 
    seguimiento_db.sede AS sede ON programa.Cod_Sede = sede.Cod_Sede
    `;
        conexion.query(query, (error, resultados)=>{
        if (error) {
            console.error('Error al consultar la base de datos:', error);
            return res.status(500).send('Error interno del servidor');
        }

        if (resultados.length > 0) {
            res.send(resultados);
        } else {
            res.status(404).send('Persona no encontrada');
        }
    })
})

// mostrar a todos los docentes
app.get('/api/buscar-docentes',(req,res) =>{
    const query = `
    SELECT 
    d.Cod_Docente,
    d.Nombre,
    d.Apellidos,
    d.Carnet,
    d.Profesion,
    d.Correo,
    d.Telefono,
    d.Cod_Area,
    a.Nombre_Area
FROM 
    seguimiento_db.docentes d
JOIN 
    seguimiento_db.area a
ON 
    d.Cod_Area = a.Cod_Area;
    `;
        conexion.query(query, (error, resultados)=>{
        if (error) {
            console.error('Error al consultar la base de datos:', error);
            return res.status(500).send('Error interno del servidor');
        }

        if (resultados.length > 0) {
            res.send(resultados);
        } else {
            res.status(404).send('Docente no encontrado');
        }
    })
})


// Subir los archivos
// Configuración de Multer(ruta del archivo)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); // Directorio donde se almacenan los archivos
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname)); // Nombre único para cada archivo
    }
  });
  
var upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.post('/api/fondo_certificados', upload.single('fondo'), (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).send({ message: 'No se ha subido ningún archivo' });
    }

    let data  = {
        Nombre_C: file.originalname,
        Ruta:'uploads/' + file.filename,
        Tipo: file.mimetype,
        Tamano: file.size
    };

    let  sql = 'INSERT INTO seguimiento_db.fondo_certificados SET ?';
    conexion.query(sql, data, (error, result) => {
        if (error) {
            console.error('Error al guardar el archivo en la base de datos:', error);
            return res.status(500).send('Error interno del servidor');
        }
        res.status(201).send({ message: 'Archivo cargado y datos guardados en la base de datos.', file: data });
    });
});


// Busca la portada del programa
app.get('/api/fondo_certificados', (req, res) => {
    const codPrograma = 2;
    const sql = `SELECT 
                p.Nombre,
                fp.*
                FROM 
                marketing_db.programas p
                JOIN 
                    marketing_db.fondo_programa fp
                ON 
                    p.Cod_Fondo_P = fp.Cod_Fondo_P
                WHERE 
                    p.Cod_Programa = ?
                ORDER BY 
                    fp.Cod_Fondo_P DESC
                LIMIT 1;`;
    conexion.query(sql, (error, result) => {
        if (error) {
            console.error('Error al consultar la base de datos:', error);
            return res.status(500).send('Error interno del servidor');
        }
        if (result.length > 0) {
            res.send(result[0]);
        } else {
            res.status(404).send('No se encontró el fondo del certificado');
        }
    });
});

// Insertar los datos del certificado en la base de datos y actualiza la tabla inscripcion
app.post('/api/certificado_conclusion', (req, res) => {
    const { Cod_Estudiante, Estudiante, CargaHoraria } = req.body;
    const FechaGeneracion = new Date();

    if (!req.files || !req.files.file) {
        return res.status(400).send('No se subió el archivo PDF');
    }
    const ArchivoCertificado = req.files.file;
    const archivoPath = `uploads/${ArchivoCertificado.name}`;

// Mueve el archivo a la carpeta de uploads
    ArchivoCertificado.mv(archivoPath, (err) => {
        if (err) {
            console.error('Error al mover el archivo:', err);
            return res.status(500).send('Error al mover el archivo');
        }

        const sqlInsertCertificado = `
            INSERT INTO seguimiento_db.certificado_conclusion 
            (Estudiante, ArchivoCertificado, CargaHoraria, FechaGeneracion) 
            VALUES (?, ?, ?, ?)
        `;

        conexion.query(sqlInsertCertificado, [Estudiante, archivoPath, CargaHoraria, FechaGeneracion], (error, results) => {
            if (error) {
                console.error('Error al insertar el certificado:', error);
                return res.status(500).send('Error al insertar el certificado');
            }

            const Cod_Certificado_C = results.insertId;
            const sqlUpdateInscripcion = `
                UPDATE seguimiento_db.inscripcion 
                SET Cod_Certificado_C = ? 
                WHERE Cod_Estudiante = ?
            `;

            conexion.query(sqlUpdateInscripcion, [Cod_Certificado_C, Cod_Estudiante], (error, results) => {
                if (error) {
                    console.error('Error al actualizar la inscripción:', error);
                    return res.status(500).send('Error al actualizar la inscripción');
                }
                res.status(201).send({ message: 'Certificado insertado y inscripción actualizada correctamente', id: Cod_Certificado_C });
            });
        });
    });
});


/* Permite que las imágenes almacenadas en el directorio uploads puedan ser accedidas 
desde cualquier origen y configura el CORS*/
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, path, stat) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
    }
}));

const puerto = process.env.PUERTO || 3000;

app.listen(puerto,function()
{
    console.log("Servidor Ok en puerto:" + puerto);
});