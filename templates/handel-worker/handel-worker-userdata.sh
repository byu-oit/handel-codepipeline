#!/bin/bash
echo "Mounting EFS"
yum install -y nfs-utils
mkdir -p /mnt/share/handel-worker
mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2 {{EFS_FILE_SYSTEM_ID}}.efs.us-west-2.amazonaws.com:/ /mnt/share/handel-worker
echo "Finished Mounting EFS"

echo "Installing Docker"
yum install -y docker
service docker start
usermod -a -G docker ec2-user
echo "Finished installing Docker"