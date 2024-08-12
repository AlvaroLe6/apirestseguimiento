var express = require('express');
var mysql = require('mysql');
var cors = require('cors');
var multer = require('multer');
var path = require('path');
var WebSocket = require('ws');

//var fileUpload = require('express-fileupload');



var app = express();
app.use(express.json());
app.use(cors());
//app.use(fileUpload());


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


const wss = new WebSocket.Server({ port: 8080 });
wss.on('connection', ws => {
    ws.on('message', message => {
      // Cuando se recibe un mensaje, reenviar a todos los clientes conectados
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });
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

// mostrar todos las programas
app.get('/api/programas',(req,res) =>{
    conexion.query('SELECT * FROM seguimiento_db.programa;', (error, filas)=>{
        if(error){
            throw error;
        }else{
            res.send(filas);
        }
    })
})

// Numero de inscritos por programa
app.get('/api/inscritos_por_programa', (req, res) => {
    const query = `
       SELECT 
            cod_programa, 
            COUNT(*) as num_inscritos 
        FROM 
            seguimiento_db.inscripciones_seg
        GROUP BY 
            cod_programa
    `;
    conexion.query(query, (error, results) => {
        if (error) {
            console.error('Error al obtener el número de inscritos:', error);
            return res.status(500).send('Error interno del servidor');
        }
        res.send(results);
    });
});

// Muestra todas las inscripciones por programa con detalles de persona
app.get('/api/inscripciones_por_programa', (req, res) => {
    const codPrograma = req.query.Cod_Programa;
    if (!codPrograma) {
        return res.status(400).send('Falta el parámetro Cod_Programa');
    }
    const sql = `
    SELECT 
            e.carnet,
            e.expedicion,
            e.nombres,
            e.ap_paterno,
            e.ap_materno,
            e.celular,
            e.correo,
            e.genero,
            e.univ_titulacion,
            e.preofesion,
            e.fecha_n,
            e.edad,
            e.cuidad_rec,
            e.asesor,
            e.modulo1,
            e.modulo2,
            e.modulo3,
            e.modulo4,
            e.modulo5,
            e.modulo6,
            e.notas_finales,
            e.estado,
            e.nivelacion,
            e.observaciones,
            e.titulo_academico,
            e.titulo_prov,
            e.cedula_identidad,
            e.certificado_nac,
            e.titulo_academico_leg,
            e.cedula_identidad_leg,
            e.certificado_nac_or,
            e.fotos,
            e.elab_monografia,
            e.monografia_rec,
            e.tramite,
            e.titulo_prov_lega,
            pg.Nombre,
            pg.version
            
    FROM 
        seguimiento_db.estudiantes_n e
    JOIN 
        seguimiento_db.inscripciones_seg ins ON e.cod_estudianteN = ins.cod_estudianteN
    JOIN 
        seguimiento_db.programa pg ON ins.cod_programa = pg.Cod_Programa

         where pg.Cod_Programa = ?;
    `;
    conexion.query(sql, [codPrograma], (error, filas) => { // Pasar codPrograma como parámetro

        if (error) {
            console.error('Error al consultar la base de datos:', error);
            return res.status(500).send('Error interno del servidor');
        } else {
            res.send(filas);
        }
    });
});


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
    tramite.Fase AS fase_tramite,
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


// Busca el ultimo fondo subido
app.get('/api/fondo_certificados', (req, res) => {
    const sql = 'SELECT * FROM seguimiento_db.fondo_certificados ORDER BY Cod_fondo_C DESC LIMIT 1';
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
app.post('/api/certificado_conclusion',upload.single('file'), (req, res) => {
    const { Cod_Estudiante, Estudiante, CargaHoraria } = req.body;
    const FechaGeneracion = new Date();

    const archivoPath = `uploads/${req.file.filename}`;

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
                  // Enviar mensaje a todos los clientes WebSocket
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ Cod_Estudiante }));
                        }
                    });
                res.status(201).send({ message: 'Certificado insertado y inscripción actualizada correctamente', id: Cod_Certificado_C });
            });
        });
});

// mostrar los estudiantes con inscripcion que tienen un certificado de conclusion asignado.
app.get('/api/buscar-estudiante-certificado-conclusion',(req,res) =>{
    const query = `
    SELECT 
    estudiante.Cod_Estudiante,
    estudiante.Carnet,
    estudiante.Nombre,
    estudiante.Apellido,
    inscripcion.Cod_Inscripcion,
    inscripcion.Cod_Programa,
    inscripcion.fechaInscripcion,
    certificado_conclusion.Cod_Certificado_C,
    certificado_conclusion.Estudiante AS Estudiante_Certificado,
    certificado_conclusion.FechaGeneracion,
    certificado_conclusion.ArchivoCertificado,
    certificado_conclusion.CargaHoraria
FROM 
    seguimiento_db.estudiante AS estudiante
JOIN 
    seguimiento_db.inscripcion AS inscripcion ON estudiante.Cod_Estudiante = inscripcion.Cod_Estudiante
JOIN 
    seguimiento_db.certificado_conclusion AS certificado_conclusion ON inscripcion.Cod_Certificado_C = certificado_conclusion.Cod_Certificado_C
    WHERE 
    inscripcion.Cod_Certificado_C IS NOT NULL;
    `;
        conexion.query(query, (error, resultados)=>{
        if (error) {
            console.error('Error al consultar la base de datos:', error);
            return res.status(500).send('Error interno del servidor');
        }

        if (resultados.length > 0) {
            res.send(resultados);
        } else {
            res.status(404).send('Certificados con inscripcion no encontrados');
        }
    })
})

// mostrar si se genero  certificado de un estudiante
app.get('/api/verificar-certificado-conclusion/:cod_estudiante', (req, res) => {
    const codEstudiante = req.params.cod_estudiante;
    const query = `
        SELECT Cod_Certificado_C 
        FROM seguimiento_db.inscripcion 
        WHERE Cod_Estudiante = ? AND Cod_Certificado_C IS NOT NULL
    `;

    conexion.query(query, [codEstudiante], (error, results) => {
        if (error) {
            console.error('Error al verificar el certificado:', error);
            return res.status(500).send('Error al verificar el certificado');
        }

        if (results.length > 0) {
            res.send({ certificadoGenerado: true });
        } else {
            res.send({ certificadoGenerado: false });
        }
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