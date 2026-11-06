// ============================================================================
// data.js — THE WEBSITE'S CONTENT (the information it displays)
// ============================================================================
// WHAT THIS FILE IS:
//   This is a JavaScript file. JavaScript is the programming language web
//   browsers run to make pages interactive. This particular file doesn't DO
//   anything by itself; it only stores information (the list of services,
//   quiz questions, checklist steps, and so on). The other JavaScript file,
//   app.js, reads this information and uses it to build parts of the page.
//
//   WHY KEEP DATA SEPARATE: if you want to add a new service or quiz question,
//   you only edit this file. You don't have to touch any HTML or program logic.
//
//   index.html loads this file BEFORE app.js, so everything here already
//   exists when app.js starts running.
//
// KEY WORDS:
//   - COMMENT: any line starting with // is a note for humans. The browser
//     skips it.
//   - VARIABLE: a name that holds a value, so you can refer to it later.
//   - const: short for "constant". It creates a variable whose name will
//     always point to the same thing. Example:  const AGE = 30;
//     These names are written in CAPITALS by convention, to show they are
//     fixed settings/data rather than values that change while the page runs.
//   - STRING: a piece of text, written inside quotes: "like this".
//   - NUMBER: written without quotes: 2, 2048, 0.5.
//   - ARRAY: an ordered LIST of values, written inside square brackets and
//     separated by commas: ["a", "b", "c"].
//   - OBJECT: a group of labeled values, written inside curly braces. Each
//     entry is a "property" in the form  name: value. Example:
//       { name: "Jellyfin", cpu: 2 }   has a property "name" and a property "cpu".
//   - The semicolon ; marks the end of a statement (like a period in a sentence).
//   - A comma after the last item in a list, like  [ "a", "b", ]  , is allowed
//     in JavaScript and makes it easier to add more items later.
// ============================================================================

// Content data for HomeLab Hub. Resource numbers are rough community rules of thumb.
// cpu = vCPUs, ram = MB, disk = GB (system disk only — media/data storage not included)

// ----------------------------------------------------------------------------
// SERVICES — the list of self-hosted apps shown in the "Service explorer".
// ----------------------------------------------------------------------------
// This is an ARRAY of OBJECTS: one object per service. app.js turns each one
// into a card on the page and uses the numbers in the Lab Builder.
//
// What each property means:
//   id       a short unique code name for the service, used internally by the
//            code (never shown to visitors). Must be different for every service.
//   name     the display name shown on the card.
//   emoji    the little picture shown on the card.
//   category which filter group it belongs to (Media, Network, etc.). app.js
//            builds the category filter buttons automatically from these.
//   type     the recommended "guest" type: "VM" (virtual machine — a complete
//            pretend computer) or "LXC" (a container — a lighter-weight
//            isolated space that shares the host's Linux system).
//   cpu      how many virtual processor cores (vCPUs) to give it.
//   ram      how much memory it needs, in MB (megabytes; 1024 MB = 1 GB).
//   disk     how much storage space it needs, in GB (gigabytes).
//   desc     a one-line description shown on the card.
//   details  a longer explanation shown in the pop-up window.
//   tags     extra keywords (an array of strings) that the search box matches,
//            so searching "movies" finds Jellyfin even though "movies" isn't
//            in its name.
//   url      the address of the service's official website.
//
// The objects are spread over several lines just to keep them readable;
// JavaScript doesn't care about line breaks here. Blank lines separate the
// categories, also just for readability.
const SERVICES = [
  // ---- Media: apps for movies, TV, photos, and audio ----
  { id: "jellyfin", name: "Jellyfin", emoji: "🎬", category: "Media", type: "LXC", cpu: 2, ram: 2048, disk: 16,
    desc: "Free, open-source media server for movies, TV, and music.",
    details: "Stream your own media library to any device. Pass through an Intel iGPU (Quick Sync) to the container for hardware transcoding.",
    tags: ["movies", "tv", "streaming", "plex alternative"], url: "https://jellyfin.org" },
  { id: "plex", name: "Plex", emoji: "📺", category: "Media", type: "LXC", cpu: 2, ram: 2048, disk: 16,
    desc: "Polished media server with apps on nearly every device.",
    details: "Some features, like hardware transcoding, need a Plex Pass. Bind-mount your media folder from the host or a NAS share.",
    tags: ["movies", "tv", "streaming"], url: "https://www.plex.tv" },
  { id: "immich", name: "Immich", emoji: "📸", category: "Media", type: "VM", cpu: 4, ram: 4096, disk: 32,
    desc: "Self-hosted Google Photos alternative with mobile backup.",
    details: "Ships as a Docker Compose stack with machine-learning features (face recognition, smart search). Run it in a Docker VM and give it plenty of RAM.",
    tags: ["photos", "backup", "google photos"], url: "https://immich.app" },
  { id: "audiobookshelf", name: "Audiobookshelf", emoji: "🎧", category: "Media", type: "LXC", cpu: 1, ram: 512, disk: 8,
    desc: "Audiobook and podcast server with progress sync.",
    details: "Lightweight and great in an LXC. Mobile apps keep your listening position across devices.",
    tags: ["audiobooks", "podcasts", "books"], url: "https://www.audiobookshelf.org" },

  // ---- Files & Productivity: file storage, syncing, and documents ----
  { id: "nextcloud", name: "Nextcloud", emoji: "☁️", category: "Files & Productivity", type: "LXC", cpu: 2, ram: 2048, disk: 32,
    desc: "Your own Dropbox / Google Drive with calendars and contacts.",
    details: "File sync, sharing, calendar, contacts, and a huge app ecosystem. Store user data on a separate dataset so it's easy to back up.",
    tags: ["files", "sync", "cloud", "drive", "calendar"], url: "https://nextcloud.com" },
  { id: "paperless", name: "Paperless-ngx", emoji: "📄", category: "Files & Productivity", type: "LXC", cpu: 2, ram: 2048, disk: 16,
    desc: "Scan, OCR, and search all your paper documents.",
    details: "Drop scanned PDFs into a folder and Paperless OCRs, tags, and indexes them automatically.",
    tags: ["documents", "ocr", "pdf", "scanning"], url: "https://docs.paperless-ngx.com" },
  { id: "syncthing", name: "Syncthing", emoji: "🔄", category: "Files & Productivity", type: "LXC", cpu: 1, ram: 512, disk: 8,
    desc: "Peer-to-peer continuous file sync between devices.",
    details: "No central cloud needed — devices sync directly. Run an always-on node in Proxmox so files are available even when other devices are off.",
    tags: ["sync", "files", "p2p"], url: "https://syncthing.net" },
  { id: "truenas", name: "TrueNAS", emoji: "🗄️", category: "Files & Productivity", type: "VM", cpu: 2, ram: 8192, disk: 32,
    desc: "Full-featured ZFS NAS operating system.",
    details: "Pass an entire HBA/SATA controller through to the VM so TrueNAS sees the raw disks. Don't pass virtual disks for your ZFS pool.",
    tags: ["nas", "zfs", "storage", "smb", "nfs"], url: "https://www.truenas.com" },

  // ---- Network: ad blocking, firewalls, secure connections, and VPNs ----
  { id: "pihole", name: "Pi-hole", emoji: "🕳️", category: "Network", type: "LXC", cpu: 1, ram: 512, disk: 4,
    desc: "Network-wide ad blocking via DNS.",
    details: "Point your router's DNS at Pi-hole to block ads and trackers for every device on the network. Give it a static IP.",
    tags: ["dns", "ads", "blocking", "privacy"], url: "https://pi-hole.net" },
  { id: "adguard", name: "AdGuard Home", emoji: "🛡️", category: "Network", type: "LXC", cpu: 1, ram: 512, disk: 4,
    desc: "DNS ad blocker with built-in DNS-over-HTTPS.",
    details: "A Pi-hole alternative with encrypted upstream DNS and a modern UI. Run two instances for redundancy.",
    tags: ["dns", "ads", "blocking", "doh"], url: "https://adguard.com/adguard-home/overview.html" },
  { id: "opnsense", name: "OPNsense", emoji: "🧱", category: "Network", type: "VM", cpu: 2, ram: 4096, disk: 32,
    desc: "Open-source firewall and router based on FreeBSD.",
    details: "Virtualize your router with two NICs (WAN + LAN). Needs a VM because it's FreeBSD, not Linux. Plan for what happens to your internet when the host reboots!",
    tags: ["firewall", "router", "vpn", "bsd"], url: "https://opnsense.org" },
  { id: "npm", name: "Nginx Proxy Manager", emoji: "🔀", category: "Network", type: "LXC", cpu: 1, ram: 1024, disk: 8,
    desc: "Reverse proxy with a web UI and free Let's Encrypt certificates.",
    details: "Give every service a friendly HTTPS domain name like photos.home.example.com without editing config files.",
    tags: ["reverse proxy", "ssl", "https", "certificates"], url: "https://nginxproxymanager.com" },
  { id: "caddy", name: "Caddy", emoji: "🔒", category: "Network", type: "LXC", cpu: 1, ram: 256, disk: 4,
    desc: "Tiny web server and reverse proxy with automatic HTTPS.",
    details: "A two-line Caddyfile can proxy a service with an auto-renewing certificate. Very light on resources.",
    tags: ["reverse proxy", "ssl", "https", "web server"], url: "https://caddyserver.com" },
  { id: "wireguard", name: "WireGuard", emoji: "🔐", category: "Network", type: "LXC", cpu: 1, ram: 256, disk: 4,
    desc: "Fast, modern VPN to reach your lab from anywhere.",
    details: "Forward a single UDP port and connect securely from your phone or laptop. Alternatives: Tailscale or Headscale for zero-config mesh networking.",
    tags: ["vpn", "remote access", "tailscale"], url: "https://www.wireguard.com" },

  // ---- Smart Home: home automation and security cameras ----
  { id: "homeassistant", name: "Home Assistant OS", emoji: "🏠", category: "Smart Home", type: "VM", cpu: 2, ram: 4096, disk: 32,
    desc: "Local-first home automation for thousands of devices.",
    details: "Run the official HAOS image as a VM to get Add-ons and easy updates. Pass through USB Zigbee/Z-Wave dongles.",
    tags: ["automation", "iot", "zigbee", "smart home"], url: "https://www.home-assistant.io" },
  { id: "frigate", name: "Frigate", emoji: "📹", category: "Smart Home", type: "LXC", cpu: 4, ram: 4096, disk: 16,
    desc: "NVR with real-time AI object detection for IP cameras.",
    details: "Pairs well with a Coral TPU or iGPU for detection. Store recordings on a large HDD, not your VM SSD.",
    tags: ["cameras", "nvr", "security", "ai"], url: "https://frigate.video" },
  { id: "mosquitto", name: "Mosquitto MQTT", emoji: "🦟", category: "Smart Home", type: "LXC", cpu: 1, ram: 256, disk: 2,
    desc: "Lightweight message broker for IoT devices.",
    details: "The glue between sensors, Zigbee2MQTT, and Home Assistant. Uses almost no resources.",
    tags: ["mqtt", "iot", "broker"], url: "https://mosquitto.org" },

  // ---- Security: passwords, logins, and backups ----
  { id: "vaultwarden", name: "Vaultwarden", emoji: "🔑", category: "Security", type: "LXC", cpu: 1, ram: 512, disk: 4,
    desc: "Lightweight Bitwarden-compatible password manager server.",
    details: "Works with the official Bitwarden apps and browser extensions. Back this one up religiously — and keep it behind HTTPS.",
    tags: ["passwords", "bitwarden", "vault"], url: "https://github.com/dani-garcia/vaultwarden" },
  { id: "authentik", name: "Authentik", emoji: "🪪", category: "Security", type: "LXC", cpu: 2, ram: 2048, disk: 8,
    desc: "Single sign-on (SSO) identity provider for all your apps.",
    details: "Add one login with 2FA in front of every service via OIDC, SAML, or a forward-auth proxy.",
    tags: ["sso", "auth", "2fa", "oidc", "identity"], url: "https://goauthentik.io" },
  { id: "pbs", name: "Proxmox Backup Server", emoji: "💾", category: "Security", type: "VM", cpu: 2, ram: 4096, disk: 32,
    desc: "Deduplicated, incremental backups for your Proxmox guests.",
    details: "Ideally runs on separate hardware so a host failure doesn't take out your backups too. Supports encryption and verification jobs.",
    tags: ["backup", "proxmox", "dedup"], url: "https://www.proxmox.com/en/products/proxmox-backup-server/overview" },

  // ---- Monitoring: keeping an eye on whether everything is running ----
  { id: "uptimekuma", name: "Uptime Kuma", emoji: "📈", category: "Monitoring", type: "LXC", cpu: 1, ram: 512, disk: 4,
    desc: "Pretty status pages and uptime alerts.",
    details: "Ping, HTTP, DNS, and port checks with notifications to Discord, email, ntfy, and dozens more.",
    tags: ["uptime", "status", "alerts"], url: "https://github.com/louislam/uptime-kuma" },
  { id: "grafana", name: "Grafana + Prometheus", emoji: "📊", category: "Monitoring", type: "LXC", cpu: 2, ram: 2048, disk: 32,
    desc: "Metrics collection and beautiful dashboards.",
    details: "Graph CPU, RAM, temps, and network for every host. Proxmox can push metrics directly to InfluxDB or Graphite, too.",
    tags: ["metrics", "dashboards", "graphs", "observability"], url: "https://grafana.com" },
  { id: "homepage", name: "Homepage", emoji: "🧭", category: "Monitoring", type: "LXC", cpu: 1, ram: 256, disk: 4,
    desc: "A start page dashboard for all your services.",
    details: "YAML-configured dashboard with live widgets for Proxmox, Jellyfin, Pi-hole, and more.",
    tags: ["dashboard", "start page", "links"], url: "https://gethomepage.dev" },

  // ---- Dev & Tools: programming, testing, and general-purpose machines ----
  { id: "docker", name: "Docker host", emoji: "🐳", category: "Dev & Tools", type: "VM", cpu: 4, ram: 4096, disk: 64,
    desc: "A Linux VM for running Docker Compose stacks.",
    details: "The officially recommended way to run Docker on Proxmox is inside a VM. Add Portainer or Dockge for a web UI.",
    tags: ["containers", "compose", "portainer"], url: "https://docs.docker.com" },
  { id: "forgejo", name: "Forgejo", emoji: "🌿", category: "Dev & Tools", type: "LXC", cpu: 1, ram: 1024, disk: 16,
    desc: "Lightweight self-hosted Git forge (Gitea fork).",
    details: "Repos, issues, pull requests, and CI runners — a tiny GitHub for your homelab configs.",
    tags: ["git", "code", "gitea", "ci"], url: "https://forgejo.org" },
  { id: "windows", name: "Windows 11", emoji: "🪟", category: "Dev & Tools", type: "VM", cpu: 4, ram: 8192, disk: 64,
    desc: "A desktop VM for testing or remote access.",
    details: "Use VirtIO drivers for best performance and enable TPM 2.0 + UEFI in the VM settings (required by Windows 11).",
    tags: ["desktop", "windows", "gaming"], url: "https://pve.proxmox.com/wiki/Windows_10_guest_best_practices" },
  { id: "ollama", name: "Ollama + Open WebUI", emoji: "🤖", category: "Dev & Tools", type: "VM", cpu: 8, ram: 16384, disk: 64,
    desc: "Run local large language models with a chat UI.",
    details: "Much faster with a passed-through GPU. Model size drives RAM/VRAM needs — small 7–8B models fit in ~8 GB.",
    tags: ["ai", "llm", "chatgpt", "gpu"], url: "https://ollama.com" },
];

// ----------------------------------------------------------------------------
// STARTER_PACK — services added when you click "Load starter pack" in the
// Lab Builder.
// ----------------------------------------------------------------------------
// It's an array of service ids (the "id" values from SERVICES above). These
// six are a sensible first set for a beginner's home lab.
const STARTER_PACK = ["pihole", "npm", "vaultwarden", "jellyfin", "homeassistant", "uptimekuma"];

// ----------------------------------------------------------------------------
// PRESETS — typical computer specs for the three preset buttons in the
// Lab Builder ("Mini PC", "Old desktop", "Used server").
// ----------------------------------------------------------------------------
// This is an OBJECT whose properties are themselves objects. The names mini,
// desktop and server match the data-preset="..." attributes on the buttons in
// index.html, which is how app.js knows which set of numbers to load.
//   cpu  = processor threads (how many tasks the processor can work on at once)
//   ram  = memory in GB
//   disk = storage in GB
// The extra spaces just line the columns up neatly; they don't change anything.
const PRESETS = {
  mini:    { cpu: 4,  ram: 16,  disk: 512 },
  desktop: { cpu: 8,  ram: 32,  disk: 2000 },
  server:  { cpu: 32, ram: 128, disk: 8000 },
};

// ----------------------------------------------------------------------------
// QUIZ — the questions for the "VM or LXC?" game.
// ----------------------------------------------------------------------------
// An array of objects, one per question:
//   q    the question (scenario) text
//   a    the correct answer: either "VM" or "LXC". It must exactly match the
//        data-answer="..." value on one of the answer buttons in index.html.
//   why  the explanation shown after you answer
// app.js shuffles these into a random order each time you play.
const QUIZ = [
  { q: "You want to virtualize OPNsense as your home firewall.", a: "VM", why: "OPNsense is FreeBSD-based. LXC containers share the Linux host kernel, so non-Linux OSes need a VM." },
  { q: "A Pi-hole DNS server for ad blocking.", a: "LXC", why: "Pi-hole is a small Linux service. An LXC uses a fraction of the RAM a VM would and boots in seconds." },
  { q: "TrueNAS with an HBA card passed through for your ZFS pool.", a: "VM", why: "PCIe passthrough of a whole controller is a VM feature. TrueNAS needs direct access to the disks." },
  { q: "Home Assistant OS with add-ons.", a: "VM", why: "HAOS is a full appliance OS. The official recommendation on Proxmox is to run its image as a VM." },
  { q: "A Vaultwarden password server.", a: "LXC", why: "It's a tiny Linux service — a perfect fit for an unprivileged LXC." },
  { q: "A Windows 11 VM for remote desktop.", a: "VM", why: "Windows can't run in LXC — containers are Linux only." },
  { q: "Nginx Proxy Manager as a reverse proxy.", a: "LXC", why: "A lightweight Linux web service; LXC keeps overhead minimal." },
  { q: "A host for a dozen Docker Compose stacks.", a: "VM", why: "Docker can run in LXC, but Proxmox recommends a VM for Docker for better isolation and fewer upgrade surprises." },
  { q: "Jellyfin sharing the host's Intel iGPU for transcoding.", a: "LXC", why: "LXC can share the iGPU (/dev/dri) with the host and other containers, whereas VM passthrough dedicates the device to one VM." },
  { q: "A Linux box for testing custom kernel modules.", a: "VM", why: "Containers share the host kernel, so you can't load your own kernel or modules inside one safely." },
];

// ----------------------------------------------------------------------------
// CHECKLIST — the steps in the "Getting-started checklist".
// ----------------------------------------------------------------------------
// An array of groups. Each group is an object with:
//   group  the group's title (shown on the collapsible header)
//   items  an array of strings, one per checkbox
// app.js remembers which boxes you ticked by their POSITION (for example
// "0-2" means group 0, item 2; computers usually count from 0, not 1).
// So if you reorder items here, previously saved ticks may land on different
// items.
const CHECKLIST = [
  { group: "🛠️ Install", items: [
    "Enable virtualization (VT-x / AMD-V) and IOMMU in the BIOS",
    "Flash the Proxmox VE ISO to a USB drive",
    "Install Proxmox and set a static IP address",
    "Log in to the web UI on port 8006",
  ]},
  { group: "⚙️ Configure", items: [
    "Switch to the no-subscription repository and run updates",
    "Create a non-root admin user and enable 2FA",
    "Set up storage for VMs, ISOs, and backups",
    "Download a container template (e.g. Debian) from the CT Templates menu",
  ]},
  { group: "🚀 Deploy", items: [
    "Create your first LXC container",
    "Create your first VM from an ISO",
    "Install a DNS ad blocker (Pi-hole or AdGuard Home)",
    "Set up a reverse proxy with HTTPS",
  ]},
  { group: "🛡️ Protect", items: [
    "Schedule automatic backups",
    "Test restoring a backup (seriously!)",
    "Set up remote access via VPN instead of opening ports",
    "Add uptime monitoring and notifications",
  ]},
];

// ----------------------------------------------------------------------------
// TERMINAL_SCRIPT — what the fake animated terminal at the top of the page
// "types".
// ----------------------------------------------------------------------------
// An array of steps. Each step is an object with:
//   cmd  the command that gets typed out letter by letter
//   out  the text the "computer" prints back afterwards ("" means nothing)
// Inside a string, \n means "start a new line". The output is only for show;
// no real commands are ever run.
const TERMINAL_SCRIPT = [
  { cmd: "pveversion", out: "pve-manager/9.x (running kernel: 6.x-pve)" },
  { cmd: "pct create 101 local:vztmpl/debian-12-standard.tar.zst --hostname pihole --memory 512 --net0 name=eth0,bridge=vmbr0,ip=dhcp", out: "extracting archive...\nCreating SSH host key 'ssh_host_ed25519_key' - done." },
  { cmd: "pct start 101", out: "" },
  { cmd: "qm list", out: "  VMID NAME          STATUS   MEM(MB)\n   100 opnsense      running  4096\n   102 haos          running  4096\n   103 docker        running  4096" },
  { cmd: "pct list", out: "VMID  Status   Name\n101   running  pihole\n104   running  jellyfin\n105   running  vaultwarden" },
];
