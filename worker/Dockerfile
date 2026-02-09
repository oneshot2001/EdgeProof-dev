FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# System dependencies (meson+ninja for SVF, ffmpeg/gstreamer for video)
RUN apt-get update && apt-get install -y \
    build-essential \
    meson \
    ninja-build \
    pkg-config \
    git \
    python3 \
    python3-pip \
    libgstreamer1.0-dev \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    libgstreamer-plugins-base1.0-dev \
    libssl-dev \
    libglib2.0-dev \
    libcurl4-openssl-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Clone and build libsigned-video-framework with meson
RUN git clone https://github.com/AxisCommunications/signed-video-framework.git /opt/svf \
    && meson setup /opt/svf /opt/svf-build \
    && ninja -C /opt/svf-build \
    && ninja -C /opt/svf-build install \
    && ldconfig

# Clone and build signed-video-framework-examples (contains validator binary)
RUN git clone https://github.com/AxisCommunications/signed-video-framework-examples.git /opt/svf-examples \
    && meson setup -Dbuild_all_apps=true /opt/svf-examples /opt/svf-examples-build \
    && ninja -C /opt/svf-examples-build \
    && ninja -C /opt/svf-examples-build install \
    && ldconfig

# Python app
WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY certs/ /app/certs/
COPY app/ /app/app/

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
