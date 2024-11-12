const elVideo = document.getElementById('video');

// Diccionario de traducción para emociones y género
const traducciones = {
    "happy": "feliz",
    "sad": "triste",
    "neutral": "neutral",
    "surprised": "sorprendido",
    "angry": "enojado",
    "fearful": "miedoso",
    "disgusted": "disgustado",
    "genderMale": "masculino",
    "genderFemale": "femenino"
};

// Obtener lista de dispositivos y seleccionar la cámara
navigator.mediaDevices.enumerateDevices()
    .then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const selectedDeviceId = videoDevices[2]?.deviceId || videoDevices[0].deviceId;
        cargarCamera(selectedDeviceId);
    })
    .catch(console.error);

const cargarCamera = (deviceId) => {
    navigator.mediaDevices.getUserMedia({
        video: { deviceId: deviceId ? { exact: deviceId } : undefined },
        audio: false
    })
    .then(stream => elVideo.srcObject = stream)
    .catch(console.error);
}

// Cargar Modelos
Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
]).then(cargarCamera)

elVideo.addEventListener('play', async () => {
    const canvas = faceapi.createCanvasFromMedia(elVideo);
    document.body.append(canvas);

    const displaySize = { width: elVideo.width, height: elVideo.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(elVideo)
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender()
            .withFaceDescriptors();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

        resizedDetections.forEach(detection => {
            const box = detection.detection.box;
            const age = Math.round(detection.age);
            const gender = traducciones[`gender${detection.gender.charAt(0).toUpperCase() + detection.gender.slice(1)}`] || detection.gender;

            // Obtener la emoción con mayor probabilidad y traducirla
            const expressions = detection.expressions;
            const highestEmotion = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
            const emotionInSpanish = traducciones[highestEmotion] || highestEmotion;

            // Mostrar el texto en la parte inferior del cuadro
            new faceapi.draw.DrawBox(box, {
                label: `${age} años, ${gender}, ${emotionInSpanish}`,
                anchorPosition: 'BOTTOM'
            }).draw(canvas);
        });
    }, 100);
});
