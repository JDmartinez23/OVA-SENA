
//<!-- ===== SCRIPT EFECTO SCROLL ===== -->

document.addEventListener("DOMContentLoaded", () => {
    const secciones = document.querySelectorAll("#navbar-index, #contenido-index, #personaje-index, #footer-index, #encabezado-inicio");

    const observer = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
        entrada.target.classList.add("show");
        }
    });
    }, { threshold: 0.2 });

    secciones.forEach((sec) => observer.observe(sec));
});