// ==========================================
// PARTICLES BACKGROUND ANIMATION
// ==========================================
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const particlesArray = [];
const particleCount = 100;

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 0.5;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.5;
    this.opacity = Math.random() * 0.5 + 0.2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
  }

  draw() {
    ctx.fillStyle = `rgba(0, 212, 255, ${this.opacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

for (let i = 0; i < particleCount; i++) {
  particlesArray.push(new Particle());
}

function drawConnections() {
  for (let i = 0; i < particlesArray.length; i++) {
    for (let j = i + 1; j < particlesArray.length; j++) {
      const dx = particlesArray[i].x - particlesArray[j].x;
      const dy = particlesArray[i].y - particlesArray[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 150) {
        ctx.strokeStyle = `rgba(0, 212, 255, ${0.1 * (1 - distance / 150)})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
        ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particlesArray.forEach(particle => {
    particle.update();
    particle.draw();
  });

  drawConnections();
  requestAnimationFrame(animateParticles);
}

animateParticles();

// ==========================================
// NAVIGATION AND SCROLL BEHAVIOR
// ==========================================
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (scrollY >= sectionTop - 200) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href').slice(1) === current) {
      link.classList.add('active');
    }
  });
});

// ==========================================
// SMOOTH SCROLL FOR NAVIGATION LINKS
// ==========================================
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = link.getAttribute('href');
    const targetSection = document.querySelector(targetId);
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ==========================================
// SECTION ANIMATIONS ON SCROLL
// ==========================================
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

sections.forEach(section => {
  section.style.opacity = '0';
  section.style.transform = 'translateY(30px)';
  section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(section);
});

// ==========================================
// CTA BUTTON INTERACTION
// ==========================================
const ctaButton = document.querySelector('.cta-button');
if (ctaButton) {
  ctaButton.addEventListener('click', () => {
    const contactSection = document.querySelector('#contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// ==========================================
// SKILL PROGRESS ANIMATION
// ==========================================
const progressBars = document.querySelectorAll('.progress');
const skillObserverOptions = {
  threshold: 0.5
};

const skillObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const progress = entry.target;
      progress.style.animation = 'fillWidth 1.5s ease forwards';
      skillObserver.unobserve(entry.target);
    }
  });
}, skillObserverOptions);

progressBars.forEach(bar => {
  skillObserver.observe(bar);
});

// ==========================================
// MOUSE PARALLAX EFFECT
// ==========================================
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX / window.innerWidth;
  mouseY = e.clientY / window.innerHeight;
});

// ==========================================
// CONTACT FORM HANDLING
// ==========================================
const socialBtns = document.querySelectorAll('.social-btn');
socialBtns.forEach(btn => {
  btn.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-5px) scale(1.1)';
  });
  btn.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0) scale(1)';
  });
});

// ==========================================
// DYNAMIC YEAR IN FOOTER
// ==========================================
const footerYear = document.querySelector('.footer-content p');
if (footerYear) {
  const currentYear = new Date().getFullYear();
  footerYear.textContent = `© ${currentYear} Karthikeya Reddy. All rights reserved.`;
}

// ==========================================
// CONSOLE MESSAGE
// ==========================================
console.log('%c Welcome to my 3D Portfolio!', 'color: #00d4ff; font-size: 20px; font-weight: bold;');
console.log('%c Made with HTML, CSS & JavaScript', 'color: #ff006e; font-size: 14px;');
